#!/usr/bin/env -S deno run -A
/**
 * Viola CLI
 *
 * Command-line interface for running viola convention checks.
 * Loads configuration from deno.json or viola.json and runs checkers.
 *
 * @module
 */

import { parseArgs } from "@std/cli/parse-args";
import { dirname, resolve } from "@std/path";
import {
  formatResults,
  loadConfig,
  registry,
  runViola,
  type ViolaOptions,
} from "@hiisi/viola";

export { main, run };

const args = parseArgs(Deno.args, {
  boolean: ["help", "report-only", "verbose", "list", "parallel"],
  string: ["only", "skip", "include", "project", "config"],
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
  --only <checkers>    Only run specified checkers (comma-separated)
  --skip <checkers>    Skip specified checkers (comma-separated)
  --list, -l           List all available checkers
  --include, -i <dirs> Directories to include (comma-separated)
  --project, -p <path> Project root directory (default: cwd)
  --config, -c <path>  Path to config file

CONFIGURATION:
  Config is loaded from (in order of precedence):
  1. --config flag
  2. VIOLA_CONFIG environment variable
  3. viola.json in current/parent directories
  4. deno.json "viola" field

EXAMPLES:
  viola
  viola --report-only
  viola --only type-location,similar-functions
  viola --skip duplicate-strings
  viola --verbose
  viola --project /path/to/project

CHECKERS:
`);

  for (const checker of registry.getAll()) {
    console.log(`  ${checker.meta.id}`);
    console.log(`    ${checker.meta.description}`);
    console.log();
  }
}

function listCheckers(): void {
  console.log("\nAvailable checkers:\n");

  const checkers = registry.getAll();
  const maxIdLen = Math.max(...checkers.map((c) => c.meta.id.length));

  for (const checker of checkers) {
    const id = checker.meta.id.padEnd(maxIdLen);
    const sev = checker.meta.defaultSeverity.padEnd(7);
    console.log(`  ${id}  [${sev}]  ${checker.meta.description}`);
  }

  console.log(`\nTotal: ${checkers.length} checkers\n`);
}

/**
 * Run viola with CLI arguments.
 */
async function run(cliArgs: typeof args): Promise<number> {
  if (cliArgs.help) {
    showHelp();
    return 0;
  }

  if (cliArgs.list) {
    listCheckers();
    return 0;
  }

  // Determine project root
  const projectRoot = resolve(cliArgs.project ?? Deno.cwd());

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

  // Build options
  const options: ViolaOptions = {
    projectRoot,
    include,
    exclude: config.exclude,
    extensions: config.extensions,
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
    console.log(`  Report only: ${cliArgs["report-only"]}`);
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
