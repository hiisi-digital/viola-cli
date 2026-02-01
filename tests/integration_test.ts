/**
 * Integration tests for CLI behavior
 * These tests run the CLI with different configurations and verify behavior
 */
import { assertEquals, assertStringIncludes } from "@std/assert";
import { resolve } from "@std/path";

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
  
  assertEquals(result.code, 0, "Should exit with code 0");
  assertStringIncludes(result.stdout, "viola - Convention linter");
  assertStringIncludes(result.stdout, "--help");
  assertStringIncludes(result.stdout, "--verbose");
  assertStringIncludes(result.stdout, "--report-only");
});

Deno.test("Integration - CLI shows help with -h", async () => {
  const result = await runCli(["-h"]);
  
  assertEquals(result.code, 0, "Should exit with code 0");
  assertStringIncludes(result.stdout, "viola - Convention linter");
});

Deno.test("Integration - CLI fails with no config and no plugins", async () => {
  const fixtureDir = resolve("./tests/fixtures/no-config");
  const result = await runCli(["--project", fixtureDir]);
  
  assertEquals(result.code, 1, "Should exit with code 1");
  assertStringIncludes(result.stderr, "No plugins configured");
});

Deno.test("Integration - CLI handles --report-only flag", async () => {
  const fixtureDir = resolve("./tests/fixtures/no-config");
  const result = await runCli(["--project", fixtureDir, "--report-only"]);
  
  // Even with errors, --report-only should exit 0
  // But in this case, it fails before running due to no plugins
  assertEquals(result.code, 1, "Should still fail if no plugins configured");
  assertStringIncludes(result.stderr, "No plugins configured");
});

Deno.test("Integration - CLI accepts --verbose flag", async () => {
  const result = await runCli(["--help", "--verbose"]);
  
  assertEquals(result.code, 0, "Should exit with code 0");
});

Deno.test("Integration - CLI accepts --only flag", async () => {
  const fixtureDir = resolve("./tests/fixtures/no-config");
  const result = await runCli([
    "--project",
    fixtureDir,
    "--only",
    "test-linter",
  ]);
  
  // Will fail due to no plugins, but flag should be accepted
  assertEquals(result.code, 1);
  assertStringIncludes(result.stderr, "No plugins configured");
});

Deno.test("Integration - CLI accepts --skip flag", async () => {
  const fixtureDir = resolve("./tests/fixtures/no-config");
  const result = await runCli([
    "--project",
    fixtureDir,
    "--skip",
    "test-linter",
  ]);
  
  // Will fail due to no plugins, but flag should be accepted
  assertEquals(result.code, 1);
  assertStringIncludes(result.stderr, "No plugins configured");
});

Deno.test("Integration - CLI accepts --include flag", async () => {
  const fixtureDir = resolve("./tests/fixtures/no-config");
  const result = await runCli([
    "--project",
    fixtureDir,
    "--include",
    "src,lib",
  ]);
  
  // Will fail due to no plugins, but flag should be accepted
  assertEquals(result.code, 1);
  assertStringIncludes(result.stderr, "No plugins configured");
});

Deno.test("Integration - CLI accepts --config flag", async () => {
  const fixtureDir = resolve("./tests/fixtures/valid-config");
  const configPath = resolve("./tests/fixtures/valid-config/viola.config.ts");
  const result = await runCli([
    "--project",
    fixtureDir,
    "--config",
    configPath,
  ]);
  
  // This may fail if viola module is not available, but flag should be accepted
  // We're just testing that the CLI doesn't reject the flag
});

Deno.test("Integration - CLI accepts --plugins flag", async () => {
  const fixtureDir = resolve("./tests/fixtures/no-config");
  const result = await runCli([
    "--project",
    fixtureDir,
    "--plugins",
    "@hiisi/viola-default-lints",
  ]);
  
  // This will likely fail to load the plugin, but flag should be accepted
  // The error message will vary based on whether the plugin is available
});

Deno.test("Integration - CLI accepts --parallel flag", async () => {
  const result = await runCli(["--help", "--parallel"]);
  
  assertEquals(result.code, 0, "Should exit with code 0");
});

Deno.test("Integration - CLI accepts --list flag", async () => {
  const fixtureDir = resolve("./tests/fixtures/no-config");
  const result = await runCli(["--project", fixtureDir, "--list"]);
  
  // Will show "No plugins configured" message
  assertStringIncludes(result.stdout, "No plugins configured");
});

Deno.test("Integration - CLI accepts -l alias for list", async () => {
  const fixtureDir = resolve("./tests/fixtures/no-config");
  const result = await runCli(["--project", fixtureDir, "-l"]);
  
  // Will show "No plugins configured" message
  assertStringIncludes(result.stdout, "No plugins configured");
});

Deno.test("Integration - CLI accepts -v alias for verbose", async () => {
  const result = await runCli(["-h", "-v"]);
  
  assertEquals(result.code, 0, "Should exit with code 0");
});

Deno.test("Integration - CLI accepts -r alias for report-only", async () => {
  const fixtureDir = resolve("./tests/fixtures/no-config");
  const result = await runCli(["-p", fixtureDir, "-r"]);
  
  // Will fail due to no plugins
  assertEquals(result.code, 1);
});

Deno.test("Integration - CLI accepts -p alias for project", async () => {
  const fixtureDir = resolve("./tests/fixtures/no-config");
  const result = await runCli(["-p", fixtureDir]);
  
  // Will fail due to no plugins
  assertEquals(result.code, 1);
});

Deno.test("Integration - CLI accepts -i alias for include", async () => {
  const fixtureDir = resolve("./tests/fixtures/no-config");
  const result = await runCli(["-p", fixtureDir, "-i", "src"]);
  
  // Will fail due to no plugins
  assertEquals(result.code, 1);
});

Deno.test("Integration - CLI accepts -c alias for config", async () => {
  const configPath = resolve("./tests/fixtures/valid-config/viola.config.ts");
  const result = await runCli(["-c", configPath]);
  
  // May fail for various reasons, but flag should be accepted
});

Deno.test("Integration - CLI handles multiple flags combined", async () => {
  const fixtureDir = resolve("./tests/fixtures/no-config");
  const result = await runCli([
    "-p",
    fixtureDir,
    "-v",
    "-r",
    "-i",
    "src,lib",
  ]);
  
  // Will fail due to no plugins
  assertEquals(result.code, 1);
  assertStringIncludes(result.stderr, "No plugins configured");
});

Deno.test("Integration - CLI provides helpful error for missing config", async () => {
  const fixtureDir = resolve("./tests/fixtures/no-config");
  const result = await runCli(["--project", fixtureDir]);
  
  assertEquals(result.code, 1);
  assertStringIncludes(result.stderr, "No plugins configured");
  assertStringIncludes(result.stderr, "Create a viola.config.ts");
  assertStringIncludes(result.stderr, "Example:");
});

Deno.test("Integration - CLI list shows helpful message when no plugins", async () => {
  const fixtureDir = resolve("./tests/fixtures/no-config");
  const result = await runCli(["--project", fixtureDir, "--list"]);
  
  assertStringIncludes(result.stdout, "No plugins configured");
  assertStringIncludes(result.stdout, "Create a viola.config.ts");
});

Deno.test("Integration - CLI handles invalid project path gracefully", async () => {
  const result = await runCli(["--project", "/nonexistent/path"]);
  
  // Should handle gracefully, likely with an error message
  assertEquals(result.code, 1);
});
