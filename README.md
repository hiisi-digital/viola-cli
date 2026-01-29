# `viola-cli`

<div align="center" style="text-align: center;">

[![JSR](https://jsr.io/badges/@hiisi/viola-cli)](https://jsr.io/@hiisi/viola-cli)
[![GitHub Issues](https://img.shields.io/github/issues/hiisi-digital/viola-cli.svg)](https://github.com/hiisi-digital/viola-cli/issues)
![License](https://img.shields.io/github/license/hiisi-digital/viola-cli?color=%23009689)

> CLI for viola convention linter.

</div>

## What it does

`viola-cli` is a command-line interface for [`@hiisi/viola`](https://jsr.io/@hiisi/viola).
Loads configuration from `deno.json` or `viola.json` and runs convention checkers.

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
# Run all checkers
viola

# Report only (don't fail on errors)
viola --report-only

# Run specific checkers
viola --only type-location,similar-functions

# Skip checkers
viola --skip duplicate-strings

# Verbose output
viola --verbose

# Custom project root
viola --project /path/to/project

# List available checkers
viola --list
```

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
    "checkers": ["type-location", "similar-functions"],
    "skip": ["duplicate-strings"],
    "include": ["src", "packages"],
    "scopes": {
      "packages/legacy/**": {
        "skip": ["type-location"]
      }
    }
  }
}
```

### viola.json

```json
{
  "checkers": [
    "type-location",
    { "id": "similar-functions", "severity": "error" }
  ],
  "include": ["src"],
  "scopes": {
    "src/generated/**": {
      "skip": ["similar-types"]
    }
  }
}
```

Subdirectory `viola.json` files inherit from parent configs and can override settings.

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
