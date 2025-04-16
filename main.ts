import { parseArgs } from '@std/cli/parse-args';
import { parseLcov, calculateCoverageSummary, formatCoverageSummary, checkThresholds, type Config } from './lcov_parser.ts';

const readThresholdFromFile = (filePath: string): Config => {
  try {
    return JSON.parse(Deno.readTextFileSync(filePath));
  } catch {
    return {};
  }
}

const mergeConfig = (
  cliConfig: Config,
  configFromFile: Config,
) => {
  return {
    lines: cliConfig.lines ?? configFromFile.lines ?? 100,
    branches: cliConfig.branches ?? configFromFile.branches ?? 100,
    functions: cliConfig.functions ?? configFromFile.functions ?? 100,
    perFile: cliConfig.perFile ?? configFromFile.perFile ?? false,
    exclude: cliConfig.exclude ?? configFromFile.exclude,
    include: cliConfig.include ?? configFromFile.include,
  };
}


const collectCoverage = async (config: Config) => {
  const args = ["coverage", "--lcov"];
  if (config.exclude) args.push(`--exclude=${config.exclude}`);
  if (config.include) args.push(`--include=${config.exclude}`);
  const coverageProcess = new Deno.Command("deno", {
    args,
    stdout: "piped",
  }).spawn();

  const output = await coverageProcess.output();
  return new TextDecoder().decode(output.stdout);
}

type Args = { [x: string]: any; _: Array<string | number>; };

const getConfig = (args: Args): Config => {
  const thresholdFromFile = readThresholdFromFile(args.configFile);

  return mergeConfig({
    lines: args.lines,
    branches: args.branches,
    functions: args.functions,
    perFile: args.perFile,
    exclude: args.exclude,
    include: args.include,
  }, thresholdFromFile);
}

const main = async () => {
  const args = parseArgs(Deno.args, {
    boolean: ["perFile"],
    default: {
      configFile: '.denocoveragerc.json',
    }
  });
  const config = getConfig(args);
  const coverageStr = await collectCoverage(config);
  const coverage = calculateCoverageSummary(parseLcov(coverageStr));


  console.log(formatCoverageSummary(coverage));

  const result = checkThresholds(coverage, config);
  const statusCode = result.passed ? 0 : 1;
  result.failures.forEach(line => console.error(line));

  Deno.exit(statusCode);
}

main();
