#!/usr/bin/env -S deno run -A
/**
 * Viola CLI
 *
 * Command-line interface for running viola convention checks.
 * Loads configuration from viola.config.ts (preferred) or deno.json.
 *
 * @module
 */

import {
    BaseLinter,
    discoverPlugins,
    formatResults,
    loadConfig,
    registerDiscoveredLinters,
    registry,
    runViola,
    type IssueCatalog,
    type LinterPlugin,
    type ViolaOptions
} from "@hiisi/viola";
import { parseArgs } from "@std/cli/parse-args";
import { resolve } from "@std/path";

export { main, run };

interface CliArgs {
  help: boolean;
  "report-only": boolean;
  verbose: boolean;
  list: boolean;
  parallel: boolean;
  only?: string;
  skip?: string;
  include?: string;
  project?: string;
  config?: string;
  plugins?: string;
  h?: boolean;
  r?: boolean;
  v?: boolean;
  l?: boolean;
  p?: string;
  i?: string;
  c?: string;
  _: (string | number)[];
}

const args: CliArgs = parseArgs(Deno.args, {
  boolean: ["help", "report-only", "verbose", "list", "parallel"],
  string: ["only", "skip", "include", "project", "config", "plugins"],
  alias: {
    h: "help",
    r: "report-only",
    v: "verbose",
    l: "list",
    p: "project",
    i: "include",
    c: "config",
  },
  default: {
    "report-only": false,
    verbose: false,
    parallel: false,
  },
});

function showHelp(): void {
  console.log(`
viola - Convention linter for codebases

Checks for convention violations — naming patterns, file organization,
code duplication, and project-specific rules.

USAGE:
  viola [options]
  deno run -A jsr:@hiisi/viola-cli [options]

OPTIONS:
  --help, -h           Show this help message
  --report-only, -r    Report issues without failing (exit code 0)
  --verbose, -v        Verbose output
  --parallel           Run checkers in parallel
  --only <linters>     Only run specified linters (comma-separated)
  --skip <linters>     Skip specified linters (comma-separated)
  --list, -l           List all available linters (requires plugins loaded)
  --include, -i <dirs> Directories to include (comma-separated)
  --project, -p <path> Project root directory (default: cwd)
  --config, -c <path>  Path to config file
  --plugins <plugins>  Plugin specifiers to load (comma-separated, overrides config)

CONFIGURATION:
  Config is loaded from viola.config.ts (preferred) or deno.json.
  
  Example viola.config.ts:
    import { viola, report, when, Impact } from "@hiisi/viola";
    import { defaultLints } from "@hiisi/viola-default-lints";
    
    export default viola()
      .use(defaultLints)
      .rule(report.error, when.impact.atLeast(Impact.Major))
      .rule(report.warn, when.impact.is(Impact.Minor))
      .rule(report.off, when.in("**/*_test.ts"));

EXAMPLES:
  viola
  viola --report-only
  viola --only type-location,similar-functions
  viola --skip duplicate-strings
  viola --verbose
  viola --project /path/to/project
  viola --plugins @hiisi/viola-default-lints

PLUGINS:
  Viola has no built-in linters. Install @hiisi/viola-default-lints for
  the standard linter set, or create your own plugins.
`);
}

/**
 * Register linters from builder config plugins.
 * Returns catalogs for rule evaluation.
 */
function registerBuilderPlugins(plugins: readonly LinterPlugin[]): Map<string, IssueCatalog> {
  const catalogs = new Map<string, IssueCatalog>();
  
  const registerLinter = (linter: BaseLinter) => {
    registry.register(linter);
    if (linter.catalog) {
      catalogs.set(linter.meta.id, linter.catalog);
    }
  };

  for (const plugin of plugins) {
    if (plugin instanceof BaseLinter) {
      registerLinter(plugin);
    } else if (Array.isArray(plugin)) {
      for (const linter of plugin) {
        if (linter instanceof BaseLinter) {
          registerLinter(linter);
        }
      }
    } else if (typeof plugin === "object" && plugin !== null) {
      // Plugin object with linters or default export
      const linters = (plugin as { linters?: BaseLinter[]; default?: BaseLinter | BaseLinter[] }).linters;
      const defaultExport = (plugin as { linters?: BaseLinter[]; default?: BaseLinter | BaseLinter[] }).default;
      
      if (linters) {
        for (const linter of linters) {
          if (linter instanceof BaseLinter) {
            registerLinter(linter);
          }
        }
      }
      if (defaultExport) {
        if (defaultExport instanceof BaseLinter) {
          registerLinter(defaultExport);
        } else if (Array.isArray(defaultExport)) {
          for (const linter of defaultExport) {
            if (linter instanceof BaseLinter) {
              registerLinter(linter);
            }
          }
        }
      }
    }
  }
  
  return catalogs;
}

async function listLinters(projectRoot: string, verbose: boolean, configPath?: string): Promise<void> {
  // Load config to get plugins
  const { config, builderConfig } = await loadConfig(projectRoot, { verbose, configPath });
  
  // Register linters from builder config or string plugins
  if (builderConfig && builderConfig.plugins.length > 0) {
    registerBuilderPlugins(builderConfig.plugins);
  } else if (config.plugins.length > 0) {
    console.log("\nLoading plugins...");
    const discovery = await discoverPlugins(config.plugins, { verbose });
    registerDiscoveredLinters(discovery);
  } else {
    console.log("\nNo plugins configured.");
    console.log("Create a viola.config.ts with .use() to add linters.");
    console.log("\nExample:");
    console.log("  import { viola } from '@hiisi/viola';");
    console.log("  import { defaultLints } from '@hiisi/viola-default-lints';");
    console.log("  export default viola().use(defaultLints);");
    console.log();
    return;
  }

  const linters = registry.getAll();
  
  if (linters.length === 0) {
    console.log("\nNo linters found in loaded plugins.");
    return;
  }

  console.log("\nAvailable linters:\n");

  const maxIdLen = Math.max(...linters.map((l) => l.meta.id.length));

  for (const linter of linters) {
    const id = linter.meta.id.padEnd(maxIdLen);
    const issueCount = Object.keys(linter.catalog).length;
    console.log(`  ${id}  (${issueCount} issues)  ${linter.meta.description}`);
  }

  const pluginCount = builderConfig?.plugins.length ?? config.plugins.length;
  console.log(`\nTotal: ${linters.length} linters from ${pluginCount} plugin(s)\n`);
}

/**
 * Run viola with CLI arguments.
 */
async function run(cliArgs: typeof args): Promise<number> {
  if (cliArgs.help) {
    showHelp();
    return 0;
  }

  // Determine project root and config path
  const projectRoot = resolve(cliArgs.project ?? Deno.cwd());
  const configPath = cliArgs.config ? resolve(cliArgs.config) : undefined;

  if (cliArgs.list) {
    await listLinters(projectRoot, cliArgs.verbose, configPath);
    return 0;
  }

  // Load config
  const { config, sources, builderConfig } = await loadConfig(projectRoot, {
    verbose: cliArgs.verbose,
    configPath,
  });

  // Parse CLI overrides
  const include = cliArgs.include
    ? cliArgs.include.split(",").map((s: string) => s.trim())
    : config.include.length > 0
      ? config.include
      : ["src", "packages", "app"];

  const only = cliArgs.only
    ? cliArgs.only.split(",").map((s: string) => s.trim())
    : undefined;

  const skip = cliArgs.skip
    ? cliArgs.skip.split(",").map((s: string) => s.trim())
    : undefined;

  // Check if we have plugins (from builder or string specifiers)
  const hasBuilderPlugins = builderConfig && builderConfig.plugins.length > 0;
  const hasStringPlugins = config.plugins.length > 0 || cliArgs.plugins;

  if (!hasBuilderPlugins && !hasStringPlugins) {
    console.error("Error: No plugins configured.");
    console.error("Create a viola.config.ts with .use() to add linters.");
    console.error("\nExample:");
    console.error("  import { viola } from '@hiisi/viola';");
    console.error("  import { defaultLints } from '@hiisi/viola-default-lints';");
    console.error("  export default viola().use(defaultLints);");
    return 1;
  }

  // Get string plugins from CLI or config (only used if no builder config)
  const plugins = cliArgs.plugins
    ? cliArgs.plugins.split(",").map((s: string) => s.trim())
    : config.plugins;

  // Print header
  if (cliArgs.verbose) {
    console.log("\n" + "=".repeat(60));
    console.log("VIOLA");
    console.log("=".repeat(60));
    console.log("\nConfiguration:");
    console.log(`  Project root: ${projectRoot}`);
    console.log(`  Include: ${include.join(", ")}`);
    if (hasBuilderPlugins) {
      console.log(`  Plugins: ${builderConfig!.plugins.length} from viola.config.ts`);
    } else {
      console.log(`  Plugins: ${plugins.join(", ")}`);
    }
    console.log(`  Report only: ${cliArgs["report-only"]}`);
    if (config.inherit.length > 0) console.log(`  Inherit: ${config.inherit.join(", ")}`);
    if (only) console.log(`  Only: ${only.join(", ")}`);
    if (skip) console.log(`  Skip: ${skip.join(", ")}`);
    if (sources.length > 0) {
      console.log("\n  Config sources:");
      for (const source of sources) {
        console.log(`    - ${source.path} (${source.type})`);
      }
    }
    console.log();
  }

  try {
    // If we have builder config with plugins, register them directly
    let catalogs: Map<string, IssueCatalog> | undefined;
    if (hasBuilderPlugins) {
      catalogs = registerBuilderPlugins(builderConfig!.plugins);
    }

    // Build options - include rules from builder config for rule evaluation
    const options: ViolaOptions = {
      projectRoot,
      include,
      plugins: hasBuilderPlugins ? [] : plugins, // Empty if using builder plugins (already registered)
      inherit: config.inherit,
      linterConfig: config.linterConfig,
      reportOnly: cliArgs["report-only"],
      verbose: cliArgs.verbose,
      parallel: cliArgs.parallel,
      only,
      skip,
      // Pass rules and catalogs for rule evaluation
      rules: builderConfig?.rules,
      catalogs,
    };

    const results = await runViola(options);
    console.log(formatResults(results));

    if (results.hasErrors && !cliArgs["report-only"]) {
      return 1;
    }
    return 0;
  } catch (error) {
    console.error("\nError:");
    console.error(error instanceof Error ? error.message : String(error));

    if (cliArgs.verbose && error instanceof Error && error.stack) {
      console.error("\nStack trace:");
      console.error(error.stack);
    }

    return 1;
  }
}

/**
 * Main entry point.
 */
async function main(): Promise<void> {
  const code = await run(args);
  Deno.exit(code);
}

// Run if invoked directly
if (import.meta.main) {
  main();
}
