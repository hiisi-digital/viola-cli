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
  runProject,
  runViola,
  type ViolaOptions,
} from "@hiisi/viola";
import { parseArgs } from "@std/cli/parse-args";
import { dirname, fromFileUrl, resolve, toFileUrl } from "@std/path";

export { main, run, runWithLoadedConfig };

/**
 * Every flag, said once.
 *
 * The name of each used to appear in up to four of `parseArgs`'s lists: the
 * booleans, the strings, the aliases and the defaults. Nothing tied them
 * together, so a name misspelled in one list is a flag that parses differently
 * from the way it was declared, and neither `parseArgs` nor the compiler has
 * anything to say about it.
 */
const FLAGS = {
  "help": { kind: "boolean", short: "h" },
  "report-only": { kind: "boolean", short: "r", default: false },
  "verbose": { kind: "boolean", short: "v", default: false },
  "list": { kind: "boolean", short: "l" },
  "parallel": { kind: "boolean", default: false },
  "only": { kind: "string" },
  "skip": { kind: "string" },
  "include": { kind: "string", short: "i" },
  "project": { kind: "string", short: "p" },
  "config": { kind: "string", short: "c" },
  "plugins": { kind: "string" },
} as const satisfies Record<string, {
  readonly kind: "boolean" | "string";
  readonly short?: string;
  readonly default?: boolean;
}>;

type FlagName = keyof typeof FLAGS;

/** One flag's declaration. */
type FlagOf<K extends FlagName> = (typeof FLAGS)[K];

const flagEntries = Object.entries(FLAGS) as [
  FlagName,
  (typeof FLAGS)[FlagName],
][];

/**
 * What `parseArgs` hands back, derived from the flag table below.
 *
 * Written out by hand this listed every flag a third time, after the table and
 * the parser configuration, so a name could be spelled one way in the type and
 * another in the parser with nothing to say the two had come apart.
 */
type CliArgs =
  & {
    [K in FlagName as FlagOf<K>["kind"] extends "boolean" ? K : never]: boolean;
  }
  & {
    [K in FlagName as FlagOf<K>["kind"] extends "string" ? K : never]?: string;
  }
  & { readonly _: (string | number)[] };

/** Print an error's stack, when there is one and the run asked for it. */
function reportStack(error: unknown): void {
  if (error instanceof Error && error.stack !== undefined) {
    console.error("\nStack trace:");
    console.error(error.stack);
  }
}

/** What a run says when nothing is configured to check anything. */
const NOTHING_CONFIGURED = "\nNo plugins configured.";

/** The two spellings of the dependency-age flag, which is deno's, not ours. */
const AGE_FLAGS = ["--min-dep-age", "--minimum-dependency-age"] as const;

/** Whether an argument is one of them. */
function isAgeFlag(arg: string): boolean {
  return AGE_FLAGS.some((flag) => arg.startsWith(flag));
}

/** The flag table, in the shape `parseArgs` wants. */
const PARSE_OPTIONS = {
  boolean: flagEntries.filter(([, f]) => f.kind === "boolean").map(([n]) => n),
  string: flagEntries.filter(([, f]) => f.kind === "string").map(([n]) => n),
  alias: Object.fromEntries(
    flagEntries.filter(([, f]) => "short" in f).map((
      [n, f],
    ) => [(f as { short: string }).short, n]),
  ),
  default: Object.fromEntries(
    flagEntries.filter(([, f]) => "default" in f).map((
      [n, f],
    ) => [n, (f as { default: boolean }).default]),
  ),
};

/**
 * Read the arguments, the one way this cli reads them.
 *
 * There were two `parseArgs` calls with two hand-written copies of the flag
 * lists, so a flag added to one entry point was missing from the other and
 * neither the parser nor the compiler had anything to say about it.
 */
function parseCliArgs(argv: readonly string[]): CliArgs {
  return parseArgs([...argv], PARSE_OPTIONS) as CliArgs;
}

const args: CliArgs = parseCliArgs(Deno.args);

function showHelp(): void {
  console.log(`
viola - Convention linter for codebases

Checks for convention violations: naming patterns, file organization,
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

/**
 * Print what is registered, and say so when nothing is.
 *
 * Both entry points listed linters, each with its own copy of the loading, the
 * empty cases and the table. Four messages existed twice, so one of them could
 * be improved and the other left as it was with nothing to notice.
 */
function printLinters(): void {
  const linters = registry.getAll();

  if (linters.length === 0) {
    console.log("\nNo linters found in loaded plugins.");
    return;
  }

  console.log("\nAvailable linters:\n");
  const width = Math.max(...linters.map((l: BaseLinter) => l.meta.id.length));
  for (const linter of linters) {
    const id = linter.meta.id.padEnd(width);
    const issues = Object.keys(linter.catalog).length;
    console.log(`  ${id}  (${issues} issues)  ${linter.meta.description}`);
  }
  console.log(`\nTotal: ${linters.length} linters loaded\n`);
}

/**
 * Register whatever the config declares, and say what it found.
 *
 * Returns false when nothing was registered, which is not a failure to report
 * here: the caller decides whether an unlintable project is an error.
 */
async function registerFrom(
  config: { readonly plugins: readonly string[] },
  builderConfig: { readonly linters: readonly BaseLinter[] } | undefined,
  verbose: boolean,
): Promise<boolean> {
  if (builderConfig && builderConfig.linters.length > 0) {
    registerBuilderLinters(builderConfig.linters);
    return true;
  }
  if (config.plugins.length > 0) {
    console.log("\nLoading plugins...");
    registerDiscoveredLinters(
      await discoverPlugins([...config.plugins], { verbose }),
    );
    return true;
  }
  return false;
}

async function listLinters(
  projectRoot: string,
  verbose: boolean,
  configPath?: string,
): Promise<void> {
  const { config, builderConfig } = await loadConfig(projectRoot, {
    verbose,
    ...(configPath === undefined ? {} : { configPath }),
  });

  if (!await registerFrom(config, builderConfig, verbose)) {
    console.log(NOTHING_CONFIGURED);
    console.log("Create a viola.config.ts with .use() to add linters.");
    console.log();
    return;
  }

  printLinters();
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

  try {
    // The run itself is `runProject`, which is viola's, and this is the only
    // place the cli adds anything to it: the arguments a person typed, and the
    // config module the subprocess above already had to import. Registering
    // linters, resolving the include list and reading the grammar rules all
    // used to live here, which meant a project could not perform its own run
    // without shelling out to this.
    return await runProject({
      projectRoot,
      ...(cliArgs.include === undefined ? {} : {
        include: cliArgs.include.split(",").map((s: string) => s.trim()),
      }),
      ...(configPath === undefined ? {} : { configPath }),
      ...(cliArgs.only === undefined ? {} : {
        only: cliArgs.only.split(",").map((s: string) => s.trim()),
      }),
      ...(cliArgs.skip === undefined ? {} : {
        skip: cliArgs.skip.split(",").map((s: string) => s.trim()),
      }),
      reportOnly: cliArgs["report-only"],
      verbose: cliArgs.verbose,
      parallel: cliArgs.parallel,
      env: Deno.env.toObject(),
    });
  } catch (error) {
    console.error("\nError:");
    console.error(error instanceof Error ? error.message : String(error));

    if (cliArgs.verbose) reportStack(error);

    return 1;
  }
}

/**
 * Run viola with a pre-loaded config module (for use from local runner scripts).
 * This bypasses the file:// import issue when running from JSR context.
 */
async function runWithLoadedConfig(
  rawArgs: string[],
  configModule: unknown,
): Promise<number> {
  const cliArgs: CliArgs = parseCliArgs(rawArgs);

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
    if (!await registerFrom(config, builderConfig, cliArgs.verbose)) {
      console.log(NOTHING_CONFIGURED);
      return 1;
    }
    printLinters();
    return 0;
  }

  try {
    // Identical to `run()` except for the config module, which the subprocess
    // above already had to import. `runProject` is viola's, so the cli and a
    // project running viola on itself execute the same path by construction
    // rather than by two implementations agreeing.
    return await runProject({
      projectRoot,
      ...(cliArgs.include === undefined ? {} : {
        include: cliArgs.include.split(",").map((s: string) => s.trim()),
      }),
      ...(configPath === undefined ? {} : { configPath }),
      ...(cliArgs.only === undefined ? {} : {
        only: cliArgs.only.split(",").map((s: string) => s.trim()),
      }),
      ...(cliArgs.skip === undefined ? {} : {
        skip: cliArgs.skip.split(",").map((s: string) => s.trim()),
      }),
      reportOnly: cliArgs["report-only"],
      verbose: cliArgs.verbose,
      parallel: cliArgs.parallel,
      preloadedConfig: configModule,
      env: Deno.env.toObject(),
    });
  } catch (error) {
    console.error("\nError:");
    console.error(error instanceof Error ? error.message : String(error));
    if (cliArgs.verbose) reportStack(error);
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
  // A config is loaded in a subprocess carrying the project's own manifest,
  // and the reason is the import map rather than where this cli came from.
  //
  // `viola.config.ts` imports `@hiisi/viola-default-lints` by name, which is
  // the only sane way to write one. Importing it from this process resolves
  // that specifier against THIS package's map, where it does not appear, so
  // every per-package config failed to load with "not a dependency and not in
  // import map". The guard used to be "did this cli come from jsr", which is
  // a different question that happens to correlate.
  //
  // Where the project has no manifest of its own there is nothing to carry,
  // and loading in-process is as good as it gets.
  const projectRootForConfig = args.project
    ? resolve(args.project)
    : Deno.cwd();
  const projectManifest = resolve(projectRootForConfig, "deno.json");
  const needsProjectMap = await Deno.stat(projectManifest)
    .then(() => true)
    .catch(() => false);

  if (needsProjectMap) {
    // Find the config file path
    const projectRoot = projectRootForConfig;
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

      // The runner sits in a temp directory, so without the project's own
      // manifest it has no import map and every bare specifier in the config
      // fails to resolve. A config that imports `@hiisi/viola-default-lints`
      // by name, which is the only sane way to write one, could not load at
      // all before this.
      // The subprocess needs both maps: the config's bare specifiers resolve
      // against the project's, and this module's own imports against ours.
      // Deno takes one manifest, so they are merged into a temp one. The
      // project wins on a clash, since it is the config being loaded.
      // Only a file-loaded cli has a manifest on disk to merge. Run from jsr,
      // `import.meta.url` is an https url and its dependencies travel in its
      // own module graph, so there is nothing to carry and `fromFileUrl`
      // would throw on it.
      const ownManifest = import.meta.url.startsWith("file://")
        ? resolve(dirname(fromFileUrl(import.meta.url)), "deno.json")
        : null;
      const readMap = async (at: string): Promise<Record<string, unknown>> => {
        try {
          return JSON.parse(await Deno.readTextFile(at)) as Record<
            string,
            unknown
          >;
        } catch {
          return {};
        }
      };
      const own = ownManifest === null ? {} : await readMap(ownManifest);
      const proj = await readMap(projectManifest);
      const linkOf = (m: Record<string, unknown>, base: string): string[] =>
        (Array.isArray(m.links) ? m.links as string[] : []).map((l) =>
          resolve(base, l)
        );

      // A package linting itself has to lint with itself. Without this the
      // subprocess resolves the project's own name to the published copy, so
      // `viola` measured its own source with the engine from the registry and
      // a defect fixed on disk stayed invisible to the gate meant to catch it.
      // Self-mapping is what makes a self-linting config true.
      //
      // The mapping goes in `imports` rather than by carrying `name` and
      // `exports`, because deno resolves a package's own name from `exports`
      // only relative to the manifest that declares them, and this manifest is
      // a temp file elsewhere. An absolute `file://` in the map has no anchor
      // to be wrong about.
      const selfMap = (
        m: Record<string, unknown>,
        base: string,
      ): Record<string, string> => {
        const name = typeof m.name === "string" ? m.name : null;
        if (name === null) return {};
        const exp = m.exports;
        if (typeof exp === "string") {
          return { [name]: toFileUrl(resolve(base, exp)).href };
        }
        if (exp === null || typeof exp !== "object") return {};
        const out: Record<string, string> = {};
        for (
          const [sub, target] of Object.entries(exp as Record<string, unknown>)
        ) {
          if (typeof target !== "string") continue;
          const specifier = sub === "." ? name : name + sub.slice(1);
          out[specifier] = toFileUrl(resolve(base, target)).href;
        }
        return out;
      };

      const merged = {
        // The temp manifest is what the config load resolves against, and it is
        // never published. Carrying the caller's dependency-age choice here is
        // the only place it reaches the subprocess: passing the flag on the
        // outer invocation does not, so a freshly published dependency stayed
        // unreachable and the config silently fell back to whatever the
        // registry last accepted. Which version a lint ran was then invisible.
        // The temp manifest is what the config load resolves against, so any
        // setting that governs resolution has to be carried here or it does
        // not reach the subprocess. The project's own choice wins; the flag on
        // this invocation is the fallback.
        ...(proj.minimumDependencyAge !== undefined
          ? { minimumDependencyAge: proj.minimumDependencyAge }
          : Deno.args.some(isAgeFlag)
          ? { minimumDependencyAge: "0" }
          : {}),
        imports: {
          ...(own.imports as Record<string, string> ?? {}),
          ...(proj.imports as Record<string, string> ?? {}),
          // Last, so a package's own name always reaches its own source. A
          // project that also lists its own name in `imports` pointing at the
          // registry is describing what its consumers get, not what it is.
          ...selfMap(proj, projectRootForConfig),
        },
        links: [
          ...new Set([
            ...(ownManifest === null ? [] : linkOf(own, dirname(ownManifest))),
            ...linkOf(proj, projectRootForConfig),
          ]),
        ],
      };
      const ageFlag = Deno.args.find(isAgeFlag);
      const minDepAge = ageFlag === undefined ? [] : [ageFlag];

      const projectConfig = await Deno.makeTempFile({ suffix: ".json" });
      await Deno.writeTextFile(projectConfig, JSON.stringify(merged, null, 2));
      const withConfig = true;

      const cmd = new Deno.Command(Deno.execPath(), {
        args: [
          "run",
          "--allow-read",
          "--allow-env",
          "--allow-run",
          "--allow-net",
          ...(withConfig ? ["-c", projectConfig] : []),
          // Forward the dependency-age flag when this process was started with
          // it. The subprocess resolves the config's own imports, so without
          // this a freshly published dependency is unreachable there even
          // though the caller explicitly allowed it, and the config silently
          // falls back to whatever the registry last accepted.
          ...minDepAge,
          `file://${tmpFile}`,
        ],
        stdin: "inherit",
        stdout: "inherit",
        stderr: "inherit",
        cwd: Deno.cwd(),
      });
      const status = await cmd.output();
      Deno.exit(status.code);
    } finally {
      try {
        await Deno.remove(tmpFile);
      } catch { /* cleanup best-effort */ }
    }
  }

  const code = await run(args);
  Deno.exit(code);
}

// Run if invoked directly
if (import.meta.main) {
  main();
}
