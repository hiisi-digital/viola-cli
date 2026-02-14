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
  type BaseLinter,
  createGrammarRegistry,
  discoverPlugins,
  formatResults,
  type IssueCatalog,
  loadConfig,
  registerDiscoveredLinters,
  registry,
  runViola,
  type ViolaOptions,
} from "@hiisi/viola";
import { parseArgs } from "@std/cli/parse-args";
import { resolve } from "@std/path";

export { main, run, runWithLoadedConfig };

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
    import { viola } from "@hiisi/viola";
    import defaultLints from "@hiisi/viola-default-lints";
    
    export default viola()
      .use(defaultLints)  // plugin adds linters + default rules
      .rule(report.off, when.in("**/*_test.ts"));  // your overrides

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
 * Register linters from builder config.
 * Returns catalogs for rule evaluation.
 */
function registerBuilderLinters(
  linters: readonly BaseLinter[],
): Map<string, IssueCatalog> {
  const catalogs = new Map<string, IssueCatalog>();

  for (const linter of linters) {
    registry.register(linter);
    if (linter.catalog) {
      catalogs.set(linter.meta.id, linter.catalog);
    }
  }

  return catalogs;
}

async function listLinters(
  projectRoot: string,
  verbose: boolean,
  configPath?: string,
): Promise<void> {
  // Load config to get linters
  const { config, builderConfig } = await loadConfig(projectRoot, {
    verbose,
    configPath,
  });

  // Register linters from builder config or string plugins
  if (builderConfig && builderConfig.linters.length > 0) {
    registerBuilderLinters(builderConfig.linters);
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

  const maxIdLen = Math.max(
    ...linters.map((l: BaseLinter) => l.meta.id.length),
  );

  for (const linter of linters) {
    const id = linter.meta.id.padEnd(maxIdLen);
    const issueCount = Object.keys(linter.catalog).length;
    console.log(`  ${id}  (${issueCount} issues)  ${linter.meta.description}`);
  }

  const _linterCount = builderConfig?.linters.length ?? config.plugins.length;
  console.log(`\nTotal: ${linters.length} linters loaded\n`);
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

  // Check if we have linters (from builder or string plugin specifiers)
  const hasBuilderLinters = builderConfig && builderConfig.linters.length > 0;
  const hasStringPlugins = config.plugins.length > 0 || cliArgs.plugins;

  if (!hasBuilderLinters && !hasStringPlugins) {
    console.error("Error: No plugins configured.");
    console.error("Create a viola.config.ts with .use() to add linters.");
    console.error("\nExample:");
    console.error("  import { viola } from '@hiisi/viola';");
    console.error(
      "  import { defaultLints } from '@hiisi/viola-default-lints';",
    );
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
    if (hasBuilderLinters) {
      console.log(
        `  Linters: ${builderConfig!.linters.length} from viola.config.ts`,
      );
    } else {
      console.log(`  Plugins: ${plugins.join(", ")}`);
    }
    console.log(`  Report only: ${cliArgs["report-only"]}`);
    if (config.inherit.length > 0) {
      console.log(`  Inherit: ${config.inherit.join(", ")}`);
    }
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
    // If we have builder config with linters, register them directly
    let catalogs: Map<string, IssueCatalog> | undefined;
    if (hasBuilderLinters) {
      catalogs = registerBuilderLinters(builderConfig!.linters);
    }

    // Build options - include rules from builder config for rule evaluation
    const options: ViolaOptions = {
      projectRoot,
      include,
      plugins: hasBuilderLinters ? [] : plugins, // Empty if using builder linters (already registered)
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
      // Pass grammar registry for tree-sitter based extraction (required)
      grammarRegistry: builderConfig?.grammarRegistry ?? createGrammarRegistry(),
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
 * Run viola with a pre-loaded config module (for use from local runner scripts).
 * This bypasses the file:// import issue when running from JSR context.
 */
async function runWithLoadedConfig(rawArgs: string[], configModule: unknown): Promise<number> {
  const cliArgs: CliArgs = parseArgs(rawArgs, {
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

  if (cliArgs.help) {
    showHelp();
    return 0;
  }

  const projectRoot = resolve(cliArgs.project ?? Deno.cwd());
  const configPath = cliArgs.config ? resolve(cliArgs.config) : undefined;

  // Load config with pre-loaded module
  const { config, sources, builderConfig } = await loadConfig(projectRoot, {
    verbose: cliArgs.verbose,
    configPath,
    preloadedModule: configModule,
  });

  if (cliArgs.list) {
    if (builderConfig && builderConfig.linters.length > 0) {
      registerBuilderLinters(builderConfig.linters);
    } else if (config.plugins.length > 0) {
      console.log("\nLoading plugins...");
      const discovery = await discoverPlugins(config.plugins, { verbose: cliArgs.verbose });
      registerDiscoveredLinters(discovery);
    } else {
      console.log("\nNo plugins configured.");
      return 1;
    }

    const linters = registry.getAll();
    if (linters.length === 0) {
      console.log("\nNo linters found in loaded plugins.");
      return 0;
    }

    console.log("\nAvailable linters:\n");
    const maxIdLen = Math.max(...linters.map((l: BaseLinter) => l.meta.id.length));
    for (const linter of linters) {
      const id = linter.meta.id.padEnd(maxIdLen);
      const issueCount = Object.keys(linter.catalog).length;
      console.log(`  ${id}  (${issueCount} issues)  ${linter.meta.description}`);
    }
    console.log(`\nTotal: ${linters.length} linters loaded\n`);
    return 0;
  }

  // Same logic as run() from here
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

  const hasBuilderLinters = builderConfig && builderConfig.linters.length > 0;
  const hasStringPlugins = config.plugins.length > 0 || cliArgs.plugins;

  if (!hasBuilderLinters && !hasStringPlugins) {
    console.error("Error: No plugins configured.");
    console.error("Create a viola.config.ts with .use() to add linters.");
    return 1;
  }

  const plugins = cliArgs.plugins
    ? cliArgs.plugins.split(",").map((s: string) => s.trim())
    : config.plugins;

  try {
    let catalogs: Map<string, IssueCatalog> | undefined;
    if (hasBuilderLinters) {
      catalogs = registerBuilderLinters(builderConfig!.linters);
    }

    const options: ViolaOptions = {
      projectRoot,
      include,
      plugins: hasBuilderLinters ? [] : plugins,
      inherit: config.inherit,
      linterConfig: config.linterConfig,
      reportOnly: cliArgs["report-only"],
      verbose: cliArgs.verbose,
      parallel: cliArgs.parallel,
      only,
      skip,
      rules: builderConfig?.rules,
      catalogs,
      grammarRegistry: builderConfig?.grammarRegistry ?? createGrammarRegistry(),
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
 *
 * When running from a non-file context (e.g., jsr:), creates a temporary
 * local runner script to bridge the config loading (file:// imports don't
 * work from network-origin modules).
 */
async function main(): Promise<void> {
  const isRemoteOrigin = !import.meta.url.startsWith("file://");

  if (isRemoteOrigin) {
    // Find the config file path
    const projectRoot = args.project ? resolve(args.project) : Deno.cwd();
    const configPath = args.config
      ? resolve(args.config)
      : resolve(projectRoot, "viola.config.ts");

    // Check if config file exists
    try {
      await Deno.stat(configPath);
    } catch {
      // No config file - fall through to normal run (will show error message)
      const code = await run(args);
      Deno.exit(code);
      return;
    }

    // Create a temp runner that loads the config from local file context
    const tmpFile = await Deno.makeTempFile({ suffix: ".ts" });
    try {
      const runnerCode = `
import config from "file://${configPath}";
const { runWithLoadedConfig } = await import("${import.meta.url}");
const code = await runWithLoadedConfig(${JSON.stringify(Deno.args)}, config);
Deno.exit(code);
`;
      await Deno.writeTextFile(tmpFile, runnerCode);

      const cmd = new Deno.Command(Deno.execPath(), {
        args: ["run", "--allow-read", "--allow-env", "--allow-run", "--allow-net", `file://${tmpFile}`],
        stdin: "inherit",
        stdout: "inherit",
        stderr: "inherit",
        cwd: Deno.cwd(),
      });
      const status = await cmd.output();
      Deno.exit(status.code);
    } finally {
      try { await Deno.remove(tmpFile); } catch { /* cleanup best-effort */ }
    }
  }

  const code = await run(args);
  Deno.exit(code);
}

// Run if invoked directly
if (import.meta.main) {
  main();
}
