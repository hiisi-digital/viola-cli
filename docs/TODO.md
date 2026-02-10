# TODO - viola-cli

Command-line interface for the Viola convention linter.

## ✅ Phase 1: Core Implementation (COMPLETED)

### CLI Foundation

- [x] Argument parsing with @std/cli
- [x] Help message and usage documentation
- [x] Config loading from viola.config.ts
- [x] Config loading from deno.json fallback
- [x] Project root resolution
- [x] Exit codes (0 success, 1 errors)

### Linter Integration

- [x] Builder config linter registration
- [x] String plugin specifier support (legacy)
- [x] Plugin discovery and loading
- [x] Linter filtering (--only, --skip)
- [x] Include directory filtering

### Output

- [x] Human-readable issue formatting
- [x] Verbose mode with detailed info
- [x] Linter listing (--list)
- [x] Report-only mode (no exit code failure)

## 🚧 Phase 2: Testing (IN PROGRESS)

### Unit Tests (`tests/cli_test.ts`)

- [ ] Argument parsing tests
  - [ ] Boolean flags (--help, --verbose, --report-only)
  - [ ] String options (--config, --project, --only, --skip)
  - [ ] Alias handling (-h, -v, -r, -p, -c, -l, -i)
  - [ ] Default values
- [ ] showHelp() output verification

### Config Loading Tests (`tests/config_test.ts`)

- [ ] Load from viola.config.ts
- [ ] Load from deno.json viola section
- [ ] Config source precedence (CLI > config file)
- [ ] Missing config error handling
- [ ] Invalid config error handling

### Integration Tests (`tests/integration_test.ts`)

- [ ] Run on fixture project with known issues
- [ ] Verify correct issue detection
- [ ] Verify exit codes
- [ ] Verify --report-only behavior
- [ ] Verify --only/--skip filtering

### Test Fixtures (`tests/fixtures/`)

- [ ] Create minimal test project
- [ ] Config variants (builder, JSON, missing)
- [ ] Known issues for assertion

## 📋 Phase 3: Polish & Enhancements

### Error Messages

- [ ] Improve "no plugins" error with clearer instructions
- [ ] Add suggestions for common misconfigurations
- [ ] Better error context for plugin load failures

### Output Formatting

- [ ] Add color support (when TTY)
- [ ] Add `--json` output format for tooling
- [ ] Add `--quiet` mode (errors only, no summary)
- [ ] Group issues by file option
- [ ] Group issues by linter option

### Performance

- [ ] Measure and optimize startup time
- [ ] Profile parallel vs sequential execution
- [ ] Consider caching for repeated runs

### Documentation

- [ ] Add examples to README for all flags
- [ ] Document config file options comprehensively
- [ ] Add troubleshooting section

## 📋 Phase 4: Advanced Features (Future)

### Init Command

- [ ] `viola init` to create viola.config.ts
- [ ] Interactive plugin selection
- [ ] Template-based config generation

### Watch Mode

- [ ] `--watch` flag for continuous linting
- [ ] Incremental re-check on file changes
- [ ] Integration with file watchers

### IDE Integration

- [ ] Language Server Protocol (LSP) support
- [ ] Diagnostic output format for editors
- [ ] Quick fix suggestions

### Caching

- [ ] Cache parsed ASTs between runs
- [ ] Cache extraction results
- [ ] Invalidation on file change

### Baseline

- [ ] `--baseline` to ignore existing issues
- [ ] Baseline file generation
- [ ] Only report new issues mode

## CI/CD

- [x] CI workflow (thin wrapper to reusable)
- [x] Release workflow (thin wrapper to reusable)
- [ ] Add JSR publish badge verification
- [ ] Add test coverage reporting

## Notes

### Current State

The CLI is functionally complete for basic usage. The main gaps are:

1. **Testing** - No tests exist yet
2. **JSON output** - Only human-readable format
3. **Color output** - Plain text only

### Design Considerations

- Keep CLI as single file unless complexity demands splitting
- Prefer flags over subcommands for simplicity
- Exit codes must be reliable for CI integration
- Performance is important for developer experience

### Dependencies

Only these should be used:

- `@hiisi/viola` - Core runtime (already in use)
- `@std/cli` - Argument parsing (already in use)
- `@std/path` - Path utilities (already in use)
- `@std/fs` - File system utilities (if needed)
- `@std/assert` - Testing

Do not add new dependencies without explicit approval.
