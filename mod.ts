#!/usr/bin/env -S deno run -A
/**
 * Viola CLI
 *
 * Command-line interface for running viola convention checks.
 * Loads configuration from deno.json or viola.json and runs checkers.
 *
 * @module
 */

import {
    discoverPlugins,
    formatResults,
    loadConfig,
    registerDiscoveredLinters,
    registry,
    runViola,
    type ViolaOptions,
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
  Config is loaded from deno.json under the "viola" field.
  
  Required fields:
    plugins    - Array of plugin specifiers to load linters from
  
  Optional fields:
    inherit    - Array of preset names to inherit
    config     - Per-linter configuration options
    **/*.ts    - File patterns with severity rules

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

async function listLinters(projectRoot: string, verbose: boolean): Promise<void> {
  // Load config to get plugins
  const { config } = await loadConfig(projectRoot, { verbose });
  
  if (config.plugins.length === 0) {
    console.log("\nNo plugins configured.");
    console.log("Add plugins to your deno.json viola config to see available linters.");
    console.log("\nExample:");
    console.log('  "viola": {');
    console.log('    "plugins": ["@hiisi/viola-default-lints"]');
    console.log("  }");
    console.log();
    return;
  }

  // Load plugins
  console.log("\nLoading plugins...");
  const discovery = await discoverPlugins(config.plugins, { verbose });
  registerDiscoveredLinters(discovery);

  const linters = registry.getAll();
  
  if (linters.length === 0) {
    console.log("\nNo linters found in loaded plugins.");
    return;
  }

  console.log("\nAvailable linters:\n");

  const maxIdLen = Math.max(...linters.map((l) => l.meta.id.length));

  for (const linter of linters) {
    const id = linter.meta.id.padEnd(maxIdLen);
    const sev = (linter.meta.defaultSeverity ?? "warn").padEnd(7);
    console.log(`  ${id}  [${sev}]  ${linter.meta.description}`);
  }

  console.log(`\nTotal: ${linters.length} linters from ${config.plugins.length} plugin(s)\n`);
  
  // Show bundles and presets if any
  if (discovery.allBundles.size > 0) {
    console.log("Bundles:");
    for (const [name, bundle] of discovery.allBundles) {
      console.log(`  ${name} (${bundle.linters.length} linters)`);
    }
    console.log();
  }
  
  if (discovery.allPresets.size > 0) {
    console.log("Presets:");
    for (const [name, preset] of discovery.allPresets) {
      const defaultTag = preset.isDefault ? " (default)" : "";
      console.log(`  ${name}${defaultTag}`);
    }
    console.log();
  }
}

/**
 * Run viola with CLI arguments.
 */
async function run(cliArgs: typeof args): Promise<number> {
  if (cliArgs.help) {
    showHelp();
    return 0;
  }

  // Determine project root
  const projectRoot = resolve(cliArgs.project ?? Deno.cwd());

  if (cliArgs.list) {
    await listLinters(projectRoot, cliArgs.verbose);
    return 0;
  }

  // Load config
  const { config, sources } = await loadConfig(projectRoot, {
    verbose: cliArgs.verbose,
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

  // Get plugins from CLI or config
  const plugins = cliArgs.plugins
    ? cliArgs.plugins.split(",").map((s: string) => s.trim())
    : config.plugins;

  if (plugins.length === 0) {
    console.error("Error: No plugins configured.");
    console.error("Add plugins to your deno.json viola config or use --plugins flag.");
    console.error("\nExample config:");
    console.error('  "viola": {');
    console.error('    "plugins": ["@hiisi/viola-default-lints"]');
    console.error("  }");
    return 1;
  }

  // Build options
  // Note: exclude/extensions from ResolvedConfig are strings, ViolaOptions expects RegExp[]
  // runViola handles defaults internally, so we don't pass exclude/extensions from config
  const options: ViolaOptions = {
    projectRoot,
    include,
    plugins,
    inherit: config.inherit,
    linterConfig: config.linterConfig,
    reportOnly: cliArgs["report-only"],
    verbose: cliArgs.verbose,
    parallel: cliArgs.parallel,
    only,
    skip,
  };

  // Print header
  if (cliArgs.verbose) {
    console.log("\n" + "=".repeat(60));
    console.log("VIOLA");
    console.log("=".repeat(60));
    console.log("\nConfiguration:");
    console.log(`  Project root: ${projectRoot}`);
    console.log(`  Include: ${include.join(", ")}`);
    console.log(`  Plugins: ${plugins.join(", ")}`);
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
