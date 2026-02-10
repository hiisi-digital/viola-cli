# Copilot Instructions for viola-cli

CLI for the Viola convention linter. Runtime: Deno (TypeScript).

## Project Context

This is a command-line interface that wraps `@hiisi/viola` core. It handles:

- Argument parsing
- Config file loading (viola.config.ts or deno.json)
- Output formatting
- Exit codes for CI integration

## CRITICAL: Accessing @hiisi/viola

The core package is published to JSR. Use the JSR import:

```json
{
  "imports": {
    "@hiisi/viola": "jsr:@hiisi/viola@^0.1"
  }
}
```

## Before Starting Work

- **Check current branch**: If not main, you're likely working on a PR
- **Read docs/DESIGN.md**: Understand the CLI architecture
- **Read docs/TODO.md**: Know what tasks need implementation
- **Check mod.ts**: The CLI is currently a single-file implementation
- **Search before writing**: Check if functionality already exists

## Core Principles

### 1. Single File Simplicity

**The CLI is intentionally a single mod.ts file**

Don't split into modules unless the file exceeds ~500 LOC with clear separation
concerns.

**Implications:**

- All CLI code lives in mod.ts
- Tests go in tests/ directory
- Keep functions small and well-documented

### 2. User Experience First

**CLI output must be clear, helpful, and actionable**

Error messages should tell users what went wrong AND how to fix it.

**Implications:**

- Every error includes a suggestion or next step
- Help text is comprehensive but scannable
- Verbose mode provides debugging context
- Exit codes are reliable for CI

### 3. Config Precedence

**CLI args > viola.config.ts > deno.json > defaults**

Users expect command-line flags to override file config.

**Implications:**

- Always check CLI args first
- Merge configs in correct order
- Document precedence clearly

### 4. Graceful Degradation

**Never crash on user error**

Handle all error cases with helpful messages.

**Implications:**

- Catch and format all errors
- Missing config → helpful setup instructions
- Bad config → specific error with line number if possible
- Plugin failure → continue with remaining plugins

### 5. Test Everything

**CLI behavior must be tested**

Tests should cover argument parsing, config loading, and output formatting.

**Implications:**

- Unit tests for each function
- Integration tests for full CLI runs
- Snapshot tests for output format
- Test fixtures for config variants

## File Structure

```
viola-cli/
├── mod.ts              # Main CLI implementation
├── deno.json           # Package manifest
├── README.md           # Usage documentation
├── LICENSE             # MPL-2.0
├── docs/
│   ├── DESIGN.md       # Architecture documentation
│   └── TODO.md         # Implementation tasks
├── .github/
│   ├── copilot-instructions.md  # This file
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
└── tests/
    ├── cli_test.ts     # Argument parsing tests
    ├── config_test.ts  # Config loading tests
    ├── integration_test.ts
    └── fixtures/
        ├── valid-config/
        ├── invalid-config/
        └── no-config/
```

## Coding Standards

### TypeScript

- Strict mode enabled
- No `any` types - use `unknown` and narrow
- Explicit return types on exported functions
- Use `readonly` for immutable data

### Naming

- Files: `kebab-case.ts`
- Functions: `camelCase`
- Types/Interfaces: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE`

### Documentation

- All exported functions must have JSDoc
- Include `@example` for complex functions
- Keep help text up-to-date with implementation

### Error Messages

Format errors consistently:

```typescript
console.error("Error: No plugins configured.");
console.error("Create a viola.config.ts with .use() to add linters.");
console.error("\nExample:");
console.error("  import { viola } from '@hiisi/viola';");
console.error("  import defaultLints from '@hiisi/viola-default-lints';");
console.error("  export default viola().use(defaultLints);");
```

### Testing

```typescript
Deno.test("parseArgs - handles boolean flags", () => {
  // Test implementation
});

Deno.test("run - exits 0 on success", async () => {
  // Integration test
});
```

## Workflow

### Before Starting

1. Read docs/DESIGN.md for architecture context
2. Read docs/TODO.md for current tasks
3. Check existing code for patterns to follow

### Implementation Process

1. Write tests first (TDD preferred)
2. Implement the minimal solution
3. Verify all tests pass
4. Update documentation if needed

### Before Marking Done

1. All tests pass (`deno test`)
2. Type checking passes (`deno check mod.ts`)
3. Help text is accurate
4. Error messages are helpful
5. README examples work

## Commits

Format: `type: lowercase message`

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

### Good Examples

- `feat: add --json output format`
- `fix: handle missing config gracefully`
- `test: add argument parsing tests`
- `docs: update help text for --only flag`

### Bad Examples

- `Added feature` (no type, not lowercase)
- `WIP` (not descriptive)
- `fix stuff` (not specific)

## Don't

- Split mod.ts into modules unless necessary
- Add dependencies without explicit approval
- Change exit code behavior (CI relies on it)
- Remove functionality without deprecation
- Use emojis in code/comments (except ⚠️ for warnings)
- Write tests that depend on external state
- Ignore error cases
- Skip documentation updates

## Dependencies

Only these should be used:

- `@hiisi/viola` - Core runtime
- `@std/cli` - Argument parsing
- `@std/path` - Path utilities
- `@std/fs` - File system utilities
- `@std/assert` - Testing

Do not add new dependencies without explicit approval.

## Code Constraints

| Rule                  | Limit    | Reason                 |
| --------------------- | -------- | ---------------------- |
| mod.ts size           | <500 LOC | Single-file simplicity |
| Function length       | <50 LOC  | Readability            |
| Cyclomatic complexity | <10      | Maintainability        |
| Test coverage         | >80%     | Reliability            |

## Testing Guidelines

### Unit Tests

Test individual functions in isolation:

```typescript
Deno.test("showHelp - includes all flags", () => {
  const output = captureOutput(() => showHelp());
  assertStringIncludes(output, "--help");
  assertStringIncludes(output, "--verbose");
  assertStringIncludes(output, "--config");
});
```

### Integration Tests

Test full CLI behavior:

```typescript
Deno.test("CLI - runs successfully with valid config", async () => {
  const result = await runCli(["--project", "tests/fixtures/valid-config"]);
  assertEquals(result.code, 0);
});
```

### Fixtures

Create minimal test projects in `tests/fixtures/`:

```
fixtures/
├── valid-config/
│   ├── viola.config.ts
│   ├── deno.json
│   └── src/
│       └── example.ts
├── invalid-config/
│   └── viola.config.ts  (malformed)
└── no-config/
    └── src/
        └── example.ts
```

## Review Checklist

Before marking work complete:

- [ ] All tests pass (`deno test`)
- [ ] Type checking passes (`deno check mod.ts`)
- [ ] Help text is accurate and helpful
- [ ] Error messages include solutions
- [ ] README reflects any changes
- [ ] Exit codes are correct
- [ ] No console.log left in (use proper output)
- [ ] Verbose mode provides useful debug info
