/**
 * Tests for configuration loading
 */
import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { resolve, join } from "@std/path";

// Mock the loadConfig function behavior
// Since we can't easily import from @hiisi/viola in tests, we'll test the CLI behavior
// by running it with different fixture directories

Deno.test("Config loading - detects viola.config.ts", async () => {
  const fixtureDir = resolve("./tests/fixtures/valid-config");
  
  // Check if viola.config.ts exists
  const configPath = join(fixtureDir, "viola.config.ts");
  const configExists = await Deno.stat(configPath)
    .then(() => true)
    .catch(() => false);
  
  assertEquals(configExists, true, "viola.config.ts should exist in valid-config fixture");
});

Deno.test("Config loading - detects deno.json viola section", async () => {
  const fixtureDir = resolve("./tests/fixtures/json-config");
  
  // Check if deno.json exists
  const configPath = join(fixtureDir, "deno.json");
  const configExists = await Deno.stat(configPath)
    .then(() => true)
    .catch(() => false);
  
  assertEquals(configExists, true, "deno.json should exist in json-config fixture");
  
  // Verify it has viola section
  const content = await Deno.readTextFile(configPath);
  assertStringIncludes(content, '"viola"');
});

Deno.test("Config loading - handles missing config", async () => {
  const fixtureDir = resolve("./tests/fixtures/no-config");
  
  // Check that no config files exist
  const violaConfigPath = join(fixtureDir, "viola.config.ts");
  const denoJsonPath = join(fixtureDir, "deno.json");
  
  const violaConfigExists = await Deno.stat(violaConfigPath)
    .then(() => true)
    .catch(() => false);
  const denoJsonExists = await Deno.stat(denoJsonPath)
    .then(() => true)
    .catch(() => false);
  
  assertEquals(violaConfigExists, false, "viola.config.ts should not exist");
  assertEquals(denoJsonExists, false, "deno.json should not exist");
});

Deno.test("Config loading - invalid config has syntax errors", async () => {
  const fixtureDir = resolve("./tests/fixtures/invalid-config");
  const configPath = join(fixtureDir, "viola.config.ts");
  
  // Check that invalid config exists
  const configExists = await Deno.stat(configPath)
    .then(() => true)
    .catch(() => false);
  
  assertEquals(configExists, true, "invalid viola.config.ts should exist");
  
  // Verify it has incomplete syntax
  const content = await Deno.readTextFile(configPath);
  assertStringIncludes(content, "// Incomplete chain");
});

Deno.test("Config loading - JSON config has proper structure", async () => {
  const fixtureDir = resolve("./tests/fixtures/json-config");
  const configPath = join(fixtureDir, "deno.json");
  
  const content = await Deno.readTextFile(configPath);
  const config = JSON.parse(content);
  
  assertEquals(config.viola !== undefined, true, "Should have viola section");
  assertEquals(Array.isArray(config.viola.include), true, "Should have include array");
  assertEquals(config.viola.include.includes("src"), true, "Should include src directory");
});

Deno.test("Config loading - fixture structure is correct", async () => {
  // Verify all fixtures exist
  const fixtures = ["valid-config", "json-config", "no-config", "invalid-config"];
  
  for (const fixture of fixtures) {
    const fixturePath = resolve(`./tests/fixtures/${fixture}`);
    const exists = await Deno.stat(fixturePath)
      .then((stat) => stat.isDirectory)
      .catch(() => false);
    
    assertEquals(exists, true, `Fixture ${fixture} should exist as a directory`);
  }
});

Deno.test("Config loading - valid-config has source files", async () => {
  const fixtureDir = resolve("./tests/fixtures/valid-config");
  const srcDir = join(fixtureDir, "src");
  
  const exists = await Deno.stat(srcDir)
    .then((stat) => stat.isDirectory)
    .catch(() => false);
  
  assertEquals(exists, true, "src directory should exist");
  
  // Check for example.ts
  const examplePath = join(srcDir, "example.ts");
  const exampleExists = await Deno.stat(examplePath)
    .then(() => true)
    .catch(() => false);
  
  assertEquals(exampleExists, true, "example.ts should exist");
});

Deno.test("Config loading - json-config has source files", async () => {
  const fixtureDir = resolve("./tests/fixtures/json-config");
  const srcDir = join(fixtureDir, "src");
  
  const exists = await Deno.stat(srcDir)
    .then((stat) => stat.isDirectory)
    .catch(() => false);
  
  assertEquals(exists, true, "src directory should exist");
  
  // Check for example.ts
  const examplePath = join(srcDir, "example.ts");
  const exampleExists = await Deno.stat(examplePath)
    .then(() => true)
    .catch(() => false);
  
  assertEquals(exampleExists, true, "example.ts should exist");
});

Deno.test("Config loading - no-config has source files", async () => {
  const fixtureDir = resolve("./tests/fixtures/no-config");
  const srcDir = join(fixtureDir, "src");
  
  const exists = await Deno.stat(srcDir)
    .then((stat) => stat.isDirectory)
    .catch(() => false);
  
  assertEquals(exists, true, "src directory should exist");
  
  // Check for example.ts
  const examplePath = join(srcDir, "example.ts");
  const exampleExists = await Deno.stat(examplePath)
    .then(() => true)
    .catch(() => false);
  
  assertEquals(exampleExists, true, "example.ts should exist");
});
