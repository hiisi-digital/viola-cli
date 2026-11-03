# `viola-cli`

[![JSR](https://jsr.io/badges/@hiisi/viola-cli)](https://jsr.io/@hiisi/viola-cli)

> The command line for the viola convention linter.

`viola-cli` loads your `viola.config.ts`, or a `viola` section in `deno.json`, from the current directory and runs the convention linters it configures through [`@hiisi/viola`](https://jsr.io/@hiisi/viola). It is what to use from deno tasks, CI and pre-commit hooks, and for programmatic use or custom integrations `@hiisi/viola` is used directly.

## Usage

```bash
deno add jsr:@hiisi/viola-cli
deno run -A jsr:@hiisi/viola-cli
```

A config file looks like this, and the full configuration documentation is with `@hiisi/viola`.

```ts
import { Category, report, viola, when } from "@hiisi/viola";
import defaultLints from "@hiisi/viola-default-lints";

export default viola()
  .use(defaultLints)
  .set("similar-functions.minSimilarity", 0.85)
  .rule(report.off, when.in("**/*_test.ts"))
  .rule(report.error, when.category.is(Category.Correctness));
```

| Flag | What it does |
|---|---|
| `--config`, `-c` | use a different config file |
| `--report-only`, `-r` | report issues without failing, exit code 0 |
| `--only`, `--skip` | run or skip the named linters, comma-separated |
| `--include`, `-i` | directories to include |
| `--plugins` | plugin specifiers, overriding the config |
| `--parallel` | run checkers in parallel |
| `--project`, `-p` | project root directory |
| `--list`, `-l` | list the available linters |
| `--verbose`, `-v` | verbose output |

As a deno task it is `"lint:conventions": "deno run -A jsr:@hiisi/viola-cli"`, and the same command works in a pre-commit hook or a CI step, where a non-zero exit fails the run.

## License

> The project is licensed under the **Mozilla Public License 2.0**.

`SPDX-License-Identifier: MPL-2.0`

> You can check out the full license [here](https://github.com/hiisi-digital/viola-cli/blob/main/LICENSE)
