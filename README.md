# Deno Coverage Checker

A command-line tool that enforces code coverage thresholds for Deno projects. It fails the build if coverage falls below the specified thresholds.

## Features

- Check code coverage for lines, branches, and functions
- Set global or per-file thresholds
- Configure via command-line options or configuration file
- Pretty formatted coverage report


## Usage

Run in your Deno project directory:

First run test with coverage enabled:

```bash
deno test --coverage
```

Then run the coverage checker:
```bash
deno run -A jsr:@ashishkujoy/deno-coverage-checker
```

This will:
1. Run Deno's built-in coverage tool
2. Check if the coverage meets the thresholds
3. Output a formatted coverage report
4. Exit with code 1 if any thresholds aren't met

## Configuration

You can configure coverage thresholds in two ways:

### 1. Configuration File

Create a `.denocoveragerc.json` file in your project root:

```json
{
  "lines": 90,
  "branches": 85,
  "functions": 95,
  "perFile": true,
  "exclude": "src/app.ts"
}
```

### 2. Command-line Options

```bash
deno run -A jsr:@ashishkujoy/deno-coverage-checker --lines=90 --branches=85 --functions=95 --exclude=src/app.ts
```

You can also specify a custom configuration file:

```bash
deno run -A jsr:@ashishkujoy/deno-coverage-checker --configFile=custom-config.json
```

## Configuration Options

| Option       | Description                                          | Default                |
|--------------|------------------------------------------------------|------------------------|
| `lines`      | Minimum percentage of lines that must be covered     | 100                    |
| `branches`   | Minimum percentage of branches that must be covered  | 100                    |
| `functions`  | Minimum percentage of functions that must be covered | 100                    |
| `perFile`    | Whether to enforce thresholds on a per-file basis    | false                  |
| `configFile` | Path to configuration file                           | `.denocoveragerc.json` |
| `exclude`    | Comma-separated patterns of files to exclude         | undefined              |
## Example Output

```
┌──────────────┬────────┬──────┬──────────┐
│ File         │ Branch │ Line │ Function │
├──────────────┼────────┼──────┼──────────┤
│ main.ts      │ 85     │ 92   │ 100      │
│ utils.ts     │ 75     │ 89   │ 95       │
└──────────────┴────────┴──────┴──────────┘

Branches coverage 78.50% is below threshold 80%
```

## License

MIT