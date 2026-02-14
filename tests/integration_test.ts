/**
 * Integration tests for CLI behavior
 * These tests run the CLI with different configurations and verify behavior
 *
 * NOTE: These tests require the @hiisi/viola module to be available.
 * In development environments where ../viola/mod.ts doesn't exist,
 * tests will be skipped with a warning.
 */
import { assertEquals, assertStringIncludes } from "@std/assert";
import { resolve } from "@std/path";

/**
 * Check if viola module is available
 */
async function isViolaAvailable(): Promise<boolean> {
  try {
    // Try to resolve the viola module path
    const violaPath = resolve("../viola/mod.ts");
    await Deno.stat(violaPath);
    return true;
  } catch {
    return false;
  }
}

// Store the result so we only check once
let violaAvailableCache: boolean | null = null;

async function checkViolaAvailable(): Promise<boolean> {
  if (violaAvailableCache === null) {
    violaAvailableCache = await isViolaAvailable();
    if (!violaAvailableCache) {
      console.log(
        "\n⚠️  Warning: @hiisi/viola module not available at ../viola/mod.ts",
      );
      console.log(
        "   Integration tests will be skipped or may have limited functionality.\n",
      );
    }
  }
  return violaAvailableCache;
}

/**
 * Helper to run CLI command and capture output
 */
async function runCli(args: string[]): Promise<{
  code: number;
  stdout: string;
  stderr: string;
}> {
  const command = new Deno.Command(Deno.execPath(), {
    args: ["run", "-A", "./mod.ts", ...args],
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stdout, stderr } = await command.output();

  return {
    code,
    stdout: new TextDecoder().decode(stdout),
    stderr: new TextDecoder().decode(stderr),
  };
}

Deno.test("Integration - CLI shows help with --help", async () => {
  const result = await runCli(["--help"]);
  const available = await checkViolaAvailable();

  if (!available && result.stderr.includes("Module not found")) {
    console.log("  ⚠️  Skipped: viola module not available");
    return;
  }

  assertEquals(result.code, 0, "Should exit with code 0");
  assertStringIncludes(result.stdout, "viola - Convention linter");
  assertStringIncludes(result.stdout, "--help");
  assertStringIncludes(result.stdout, "--verbose");
  assertStringIncludes(result.stdout, "--report-only");
});

Deno.test("Integration - CLI fails with no config and no plugins", async () => {
  const fixtureDir = resolve("./tests/fixtures/no-config");
  const result = await runCli(["--project", fixtureDir]);
  const available = await checkViolaAvailable();

  if (!available && result.stderr.includes("Module not found")) {
    console.log("  ⚠️  Skipped: viola module not available");
    return;
  }

  assertEquals(result.code, 1, "Should exit with code 1");
  assertStringIncludes(result.stderr, "No plugins configured");
});

Deno.test("Integration - CLI provides helpful error for missing config", async () => {
  const fixtureDir = resolve("./tests/fixtures/no-config");
  const result = await runCli(["--project", fixtureDir]);
  const available = await checkViolaAvailable();

  if (!available && result.stderr.includes("Module not found")) {
    console.log("  ⚠️  Skipped: viola module not available");
    return;
  }

  assertEquals(result.code, 1);
  assertStringIncludes(result.stderr, "No plugins configured");
  assertStringIncludes(result.stderr, "Create a viola.config.ts");
  assertStringIncludes(result.stderr, "Example:");
});

Deno.test("Integration - CLI list shows helpful message when no plugins", async () => {
  const fixtureDir = resolve("./tests/fixtures/no-config");
  const result = await runCli(["--project", fixtureDir, "--list"]);
  const available = await checkViolaAvailable();

  if (!available && result.stderr.includes("Module not found")) {
    console.log("  ⚠️  Skipped: viola module not available");
    return;
  }

  assertStringIncludes(result.stdout, "No plugins configured");
  assertStringIncludes(result.stdout, "Create a viola.config.ts");
});

Deno.test("Integration - CLI handles invalid project path gracefully", async () => {
  const result = await runCli(["--project", "/nonexistent/path"]);

  // Should handle gracefully, likely with an error message
  assertEquals(result.code, 1);
});
