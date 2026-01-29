# `viola-cli`

<div align="center" style="text-align: center;">

[![JSR](https://jsr.io/badges/@hiisi/viola-cli)](https://jsr.io/@hiisi/viola-cli)
[![GitHub Issues](https://img.shields.io/github/issues/hiisi-digital/viola-cli.svg)](https://github.com/hiisi-digital/viola-cli/issues)
![License](https://img.shields.io/github/license/hiisi-digital/viola-cli?color=%23009689)

> CLI for viola convention linter.

</div>

## What it does

`viola-cli` is a command-line interface for [`@hiisi/viola`](https://jsr.io/@hiisi/viola).
Loads configuration, discovers plugins, and runs convention linters.

Use this when you want to run viola from deno tasks or scripts without writing
your own runner. For programmatic use or custom integrations, use `@hiisi/viola` directly.

## Installation

```bash
deno add jsr:@hiisi/viola-cli
```

Or run directly:

```bash
deno run -A jsr:@hiisi/viola-cli
```

## Usage

```bash
# Run all linters from discovered plugins
viola

# Specify plugins explicitly
viola --plugins ./my-linters.ts,jsr:@scope/linters

# Report only (don't fail on errors)
viola --report-only

# Run specific linters
viola --only my-linter,another-linter

# Skip linters
viola --skip slow-linter

# Verbose output
viola --verbose

# Custom project root
viola --project /path/to/project

# List available linters
viola --list
```

## Plugin Discovery

The CLI discovers linters from:

1. `--plugins` flag (comma-separated paths or JSR specifiers)
2. `viola.plugins` in deno.json
3. `plugins` field in viola.json

Plugins are modules that export linter classes extending `BaseLinter`.

## Configuration

Config is loaded from (in order of precedence):

1. `--config` flag
2. `VIOLA_CONFIG` environment variable
3. `viola.json` in current/parent directories
4. `deno.json` `viola` field

### deno.json

```json
{
  "viola": {
    "plugins": ["./linters/mod.ts"],
    "only": ["my-linter"],
    "skip": ["slow-linter"],
    "include": ["src", "packages"],
    "linters": {
      "my-linter": {
        "threshold": 10
      }
    },
    "scopes": {
      "packages/legacy/**": {
        "skip": ["strict-linter"]
      }
    }
  }
}
```

### viola.json

```json
{
  "plugins": ["jsr:@scope/my-linters"],
  "only": ["linter-a", "linter-b"],
  "include": ["src"],
  "linters": {
    "linter-a": {
      "severity": "error"
    }
  },
  "scopes": {
    "src/generated/**": {
      "skip": ["linter-a"]
    }
  }
}
```

Subdirectory `viola.json` files inherit from parent configs and can override settings.

### Config Presets

You can inherit from preset configurations:

```json
{
  "inherit": ["@scope/viola-presets/strict"],
  "plugins": ["./additional-linters.ts"]
}
```

## Deno Task

```json
{
  "tasks": {
    "lint:conventions": "deno run -A jsr:@hiisi/viola-cli"
  }
}
```

## Support

Whether you use this project, have learned something from it, or just like it,
please consider supporting it by buying me a coffee, so I can dedicate more time
on open-source projects like this :)

<a href="https://buymeacoffee.com/orgrinrt" target="_blank"><img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy Me A Coffee" style="height: auto !important;width: auto !important;" ></a>

## License

> You can check out the full license [here](https://github.com/hiisi-digital/viola-cli/blob/main/LICENSE)

This project is licensed under the terms of the **Mozilla Public License 2.0**.

`SPDX-License-Identifier: MPL-2.0`
