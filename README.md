# `viola-cli`

<div align="center" style="text-align: center;">

[![JSR](https://jsr.io/badges/@hiisi/viola-cli)](https://jsr.io/@hiisi/viola-cli)
[![GitHub Issues](https://img.shields.io/github/issues/hiisi-digital/viola-cli.svg)](https://github.com/hiisi-digital/viola-cli/issues)
![License](https://img.shields.io/github/license/hiisi-digital/viola-cli?color=%23009689)

> CLI for viola convention linter.

</div>

## What it does

`viola-cli` is a command-line interface for
[`@hiisi/viola`](https://jsr.io/@hiisi/viola). Loads your `viola.config.ts` (or
a `viola` section in `deno.json`) and runs convention linters.

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
import { report, viola, when } from "@hiisi/viola";
import defaultLints from "@hiisi/viola-default-lints";

export default viola()
  .use(defaultLints) // adds linters + default rules
  .rule(report.off, when.in("**/*_test.ts")); // your overrides
```

2. Run:

```bash
deno run -A jsr:@hiisi/viola-cli
```

## Usage

```bash
viola                          # run with viola.config.ts
viola --config ./other.ts      # use a different config file (-c)
viola --report-only            # report issues without failing, exit code 0 (-r)
viola --only my-linter         # only run specified linters (comma-separated)
viola --skip slow-linter       # skip specified linters (comma-separated)
viola --include src,app        # directories to include (-i)
viola --plugins @hiisi/viola-default-lints  # plugin specifiers, overrides config
viola --parallel               # run checkers in parallel
viola --verbose                # verbose output (-v)
viola --project /path/to/proj  # project root directory (-p)
viola --list                   # list available linters (-l)
viola --help                   # full option reference (-h)
```

## Configuration

The CLI loads config from `viola.config.ts` (preferred) or a `viola` section in
`deno.json`, resolved from the current directory (or use `--config`).

See [`@hiisi/viola`](https://jsr.io/@hiisi/viola) for full configuration
documentation.

```ts
import { Category, report, viola, when } from "@hiisi/viola";
import defaultLints from "@hiisi/viola-default-lints";

export default viola()
  .use(defaultLints)
  .set("similar-functions.minSimilarity", 0.85)
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

> You can check out the full license
> [here](https://github.com/hiisi-digital/viola-cli/blob/main/LICENSE)

This project is licensed under the terms of the **Mozilla Public License 2.0**.

`SPDX-License-Identifier: MPL-2.0`
