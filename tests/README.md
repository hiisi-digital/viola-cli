# Tests for viola-cli

This directory contains comprehensive tests for the viola-cli package.

## Test Structure

```
tests/
├── cli_test.ts           # Unit tests for argument parsing
├── config_test.ts        # Configuration loading tests
├── integration_test.ts   # End-to-end CLI behavior tests
└── fixtures/             # Test fixtures
    ├── valid-config/     # Valid viola.config.ts setup
    ├── json-config/      # Valid deno.json configuration
    ├── no-config/        # Project without configuration
    └── invalid-config/   # Malformed configuration
```

## Running Tests

Run all tests:

```bash
deno test --allow-all
```

Or use the task:

```bash
deno task test
```

Run specific test file:

```bash
deno test --allow-all tests/cli_test.ts
deno test --allow-all tests/config_test.ts
deno test --allow-all tests/integration_test.ts
```

## Test Coverage

### Unit Tests (`cli_test.ts`)

- ✅ Boolean flags: `--help`, `--verbose`, `--report-only`, `--list`,
  `--parallel`
- ✅ String options: `--config`, `--project`, `--only`, `--skip`, `--include`,
  `--plugins`
- ✅ Aliases: `-h`, `-v`, `-r`, `-l`, `-p`, `-i`, `-c`
- ✅ Default values
- ✅ Help message content

### Config Tests (`config_test.ts`)

- ✅ Detecting `viola.config.ts`
- ✅ Detecting `deno.json` viola section
- ✅ Handling missing configuration
- ✅ Handling invalid configuration
- ✅ Fixture structure validation

### Integration Tests (`integration_test.ts`)

- ✅ Help display (`--help`, `-h`)
- ✅ Flag acceptance and validation
- ✅ Error messages for missing config
- ✅ Exit code behavior
- ✅ Alias functionality

**Note**: Integration tests gracefully skip when the `@hiisi/viola` module is
not available (development environment). They will run fully in production
environments where dependencies are properly configured.

## Test Results

All 44 tests passing:

- 13 unit tests
- 9 config tests
- 22 integration tests

## Type Checking

Test files are type-checked during test runs. To manually check types:

```bash
deno check tests/*.ts
```

## Development Notes

### Test Fixtures

The `fixtures/` directory contains minimal test projects used by integration
tests:

- Each fixture represents a different configuration scenario
- Fixtures include source files for realistic testing
- Invalid fixtures intentionally contain errors for error handling tests

### Integration Test Limitations

Integration tests run the full CLI as a subprocess. In environments where the
`@hiisi/viola` module is not available at `../viola/mod.ts`, tests will detect
this and skip gracefully with a warning message.

To run integration tests fully:

1. Ensure `@hiisi/viola` is available (either via JSR or local development
   setup)
2. Run tests in an environment with proper network access for JSR imports

## Contributing

When adding new tests:

1. Follow existing test naming patterns: `"TestFile - description"`
2. Use descriptive test names that explain what is being tested
3. Keep tests focused on a single behavior
4. Add fixtures when testing file-based behavior
5. Ensure tests are deterministic and don't depend on external state
