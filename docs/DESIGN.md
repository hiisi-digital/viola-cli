# viola-cli Design Document

## Overview

`@hiisi/viola-cli` is the command-line interface for the Viola convention
linter. It provides a user-friendly way to run viola from the terminal, deno
tasks, CI pipelines, and pre-commit hooks.

## Purpose

This package provides:

1. **Command-line argument parsing** for viola configuration
2. **Config file loading** from `viola.config.ts` or `deno.json`
3. **Output formatting** with human-readable results
4. **Exit codes** for CI integration

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      @hiisi/viola-cli                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────────────────┐    │
│  │  Argument       │    │   Config Loading            │    │
│  │  Parsing        │    │   - viola.config.ts         │    │
│  │  (@std/cli)     │    │   - deno.json viola section │    │
│  └────────┬────────┘    └──────────────┬──────────────┘    │
│           │                            │                    │
│           └────────────┬───────────────┘                    │
│                        │                                    │
│                        ▼                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    Main Runner                        │  │
│  │  - Merges CLI args with config                       │  │
│  │  - Registers linters from builder or plugins         │  │
│  │  - Invokes runViola() from @hiisi/viola              │  │
│  │  - Formats and prints results                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                        │                                    │
│                        ▼                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  Output Handling                      │  │
│  │  - Human-readable issue formatting                   │  │
│  │  - Summary statistics                                │  │
│  │  - Exit code (0 = success, 1 = errors found)         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## CLI Options

| Flag            | Alias | Description                                  |
| --------------- | ----- | -------------------------------------------- |
| `--help`        | `-h`  | Show help message                            |
| `--report-only` | `-r`  | Report issues without failing (exit 0)       |
| `--verbose`     | `-v`  | Verbose output with detailed info            |
| `--list`        | `-l`  | List available linters                       |
| `--parallel`    |       | Run linters in parallel                      |
| `--only`        |       | Only run specified linters (comma-separated) |
| `--skip`        |       | Skip specified linters (comma-separated)     |
| `--include`     | `-i`  | Directories to include (comma-separated)     |
| `--project`     | `-p`  | Project root directory                       |
| `--config`      | `-c`  | Path to config file                          |
| `--plugins`     |       | Plugin specifiers (overrides config)         |

## Configuration Loading

The CLI loads configuration from multiple sources in order:

1. **CLI arguments** (highest priority)
2. **viola.config.ts** (preferred config file)
3. **deno.json `viola` section** (fallback)

### viola.config.ts

The preferred way to configure viola:

```typescript
import { report, viola, when } from "@hiisi/viola";
import defaultLints from "@hiisi/viola-default-lints";

export default viola()
  .use(defaultLints)
  .rule(report.off, when.in("**/*_test.ts"));
```

### deno.json (legacy)

Fallback for simple configs:

```json
{
  "viola": {
    "plugins": ["@hiisi/viola-default-lints"],
    "include": ["src"],
    "**/*.ts": {
      "similar-functions/*": "warn"
    }
  }
}
```

## Linter Registration

The CLI supports two modes of linter registration:

### 1. Builder Config (Preferred)

When using `viola().use()` in `viola.config.ts`, linters are registered directly
from the builder config:

```typescript
// viola.config.ts
export default viola()
  .use(defaultLints) // Linters added via builder
  .add(customLinter);
```

### 2. String Plugin Specifiers (Legacy)

When using JSON config or `--plugins` flag:

```bash
viola --plugins @hiisi/viola-default-lints
```

Plugins are dynamically imported and their linters are discovered.

## Output Format

### Standard Output

```
VIOLA - Convention Linter

Checking: src/

❌ src/utils/helpers.ts:42
   similar-functions/similar-name-high
   Function "formatDate" is very similar to "formatTime" (87% match).

⚠️ src/components/Button.tsx:15
   type-location/type-in-impl
   Type "ButtonProps" should be in types/ directory.

──────────────────────────────────
Summary: 1 error, 1 warning
```

### Verbose Output

With `--verbose`, includes:

- Configuration sources
- Plugin loading details
- Timing information
- Full context for each issue

### List Output

With `--list`:

```
Available linters:

  type-location       (4 issues)  Types must be in types/ directories
  similar-functions   (4 issues)  Detects functions with similar names
  ...

Total: 9 linters loaded
```

## Exit Codes

| Code | Meaning                                 |
| ---- | --------------------------------------- |
| 0    | Success (no errors, or `--report-only`) |
| 1    | Errors found                            |

## Error Handling

The CLI handles errors gracefully:

1. **Missing config** → Clear error with example config
2. **No plugins** → Error with plugin setup instructions
3. **Plugin load failure** → Error with details, continue with others
4. **Linter crash** → Log error, continue with other linters

## Integration Points

### Deno Tasks

```json
{
  "tasks": {
    "lint:conventions": "deno run -A jsr:@hiisi/viola-cli",
    "check": "deno task lint:conventions && deno check mod.ts"
  }
}
```

### Pre-commit Hook

```bash
#!/bin/sh
deno run -A jsr:@hiisi/viola-cli || exit 1
```

### CI (GitHub Actions)

```yaml
- name: Convention Lint
  run: deno run -A jsr:@hiisi/viola-cli
```

## File Structure

```
viola-cli/
├── mod.ts              # Single-file implementation
├── deno.json           # Package manifest
├── README.md           # Usage documentation
├── LICENSE             # MPL-2.0
├── docs/
│   ├── DESIGN.md       # This file
│   └── TODO.md         # Implementation tasks
├── .github/
│   ├── copilot-instructions.md
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
└── tests/              # Test files (TODO)
    ├── cli_test.ts     # CLI argument parsing tests
    ├── config_test.ts  # Config loading tests
    └── fixtures/       # Test fixture configs
```

## Dependencies

- `@hiisi/viola` - Core runtime
- `@std/cli` - Argument parsing
- `@std/path` - Path utilities

## Design Decisions

### Single File vs. Module Structure

Currently implemented as a single `mod.ts` for simplicity. The CLI is relatively
small (~300 LOC) and doesn't benefit much from modularization. If the CLI grows
significantly, consider splitting into:

- `src/cli.ts` - Argument parsing
- `src/config.ts` - Config loading
- `src/output.ts` - Result formatting
- `src/run.ts` - Main runner

### No Subcommands

The CLI uses a flat command structure (flags only, no subcommands like
`viola run`, `viola init`). This keeps the interface simple. If we add
subcommands later, we'd use:

- `viola` or `viola check` - Run linter (default)
- `viola init` - Create config file
- `viola list` - List linters (currently `--list`)

### Permissions

The CLI requires `-A` (all permissions) because:

- Reads arbitrary project files
- Dynamically imports plugins
- Resolves paths across the filesystem

For restricted environments, consider:

- `--allow-read` for project files
- `--allow-net` for remote plugins (JSR/npm)
- `--allow-env` for config from environment

## Testing Strategy

1. **Unit tests** for argument parsing
2. **Integration tests** with fixture configs
3. **Snapshot tests** for output formatting
4. **E2E tests** running the CLI on known codebases

## Performance Considerations

1. **Lazy loading** - Plugins loaded only when needed
2. **Parallel linting** - `--parallel` flag for concurrent linter execution
3. **Caching** - Future: cache parsed ASTs and extraction results
4. **Incremental** - Future: only check changed files

## Future Enhancements

See TODO.md for planned improvements.
