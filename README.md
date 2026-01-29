# `viola-cli`

<div align="center" style="text-align: center;">

[![JSR](https://jsr.io/badges/@hiisi/viola-cli)](https://jsr.io/@hiisi/viola-cli)
[![GitHub Issues](https://img.shields.io/github/issues/hiisi-digital/viola-cli.svg)](https://github.com/hiisi-digital/viola-cli/issues)
![License](https://img.shields.io/github/license/hiisi-digital/viola-cli?color=%23009689)

> CLI for viola convention linter.

</div>

## What it does

`viola-cli` is a command-line interface for [`@hiisi/viola`](https://jsr.io/@hiisi/viola).
Loads your `viola.config.ts` and runs convention linters.

Use this when you want to run viola from deno tasks, CI, or pre-commit hooks.
For programmatic use or custom integrations, use `@hiisi/viola` directly.

## Installation

```bash
deno add jsr:@hiisi/viola-cli
```

Or run directly:

```bash
deno run -A jsr:@hiisi/viola-cli
```

## Quick Start

1. Create a `viola.config.ts`:

```ts
import { viola, report, when } from "@hiisi/viola";
import defaultLints from "@hiisi/viola-default-lints";

export default viola()
  .use(defaultLints)  // adds linters + default rules
  .rule(report.off, when.in("**/*_test.ts"));  // your overrides
```

2. Run:

```bash
deno run -A jsr:@hiisi/viola-cli
```

## Usage

```bash
viola                          # Run with viola.config.ts
viola --config ./other.ts      # Use different config
viola --report-only            # Don't fail on errors
viola --only my-linter         # Run specific linters
viola --skip slow-linter       # Skip specific linters
viola --verbose                # Verbose output
viola --project /path/to/proj  # Custom project root
viola --list                   # List available linters
```

## Configuration

The CLI loads config from `viola.config.ts` in the current directory (or use `--config`).

See [`@hiisi/viola`](https://jsr.io/@hiisi/viola) for full configuration documentation.

```ts
import { viola, report, when, Impact, Category } from "@hiisi/viola";
import defaultLints from "@hiisi/viola-default-lints";

export default viola()
  .use(defaultLints)
  .set("similar-functions.threshold", 0.85)
  .rule(report.off, when.in("**/*_test.ts"))
  .rule(report.off, when.in("src/generated/**"))
  .rule(report.error, when.category.is(Category.Correctness));
```

## Deno Task

```json
{
  "tasks": {
    "lint:conventions": "deno run -A jsr:@hiisi/viola-cli",
    "build": "deno task lint:conventions && deno task compile"
  }
}
```

## Pre-commit Hook

```bash
#!/bin/sh
deno run -A jsr:@hiisi/viola-cli || exit 1
```

## CI

```yaml
- name: Convention Lint
  run: deno run -A jsr:@hiisi/viola-cli
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
