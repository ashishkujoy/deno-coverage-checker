import { parseArgs } from '@std/cli/parse-args';
import { parseLcov, calculateCoverageSummary, formatCoverageSummary, checkThresholds, ThresholdConfig } from './lcov_parser.ts';

const readThresholdFromFile = (filePath: string): ThresholdConfig => {
  try {
    return JSON.parse(Deno.readTextFileSync(filePath));
  } catch {
    return {};
  }
}

const mergeConfig = (
  cliThreshold: ThresholdConfig,
  configFileThresholds: ThresholdConfig,
) => {
  return {
    lines: cliThreshold.lines ?? configFileThresholds.lines ?? 100,
    branches: cliThreshold.branches ?? configFileThresholds.branches ?? 100,
    functions: cliThreshold.functions ?? configFileThresholds.functions ?? 100,
  };
}


const collectCoverage = async () => {
  const coverageProcess = new Deno.Command("deno", {
    args: ["coverage", "--lcov"],
    stdout: "piped",
  }).spawn();

  const output = await coverageProcess.output();
  return new TextDecoder().decode(output.stdout);
}

type Args = { [x: string]: any; _: Array<string | number>; };

const getThresholds = (args: Args): ThresholdConfig => {
  const thresholdFromFile = readThresholdFromFile(args.configFile);

  return mergeConfig({
    lines: args.lines,
    branches: args.branches,
    functions: args.functions
  }, thresholdFromFile);
}

const main = async () => {
  const args = parseArgs(Deno.args, {
    default: {
      configFile: '.denocoveragerc.json',
    }
  });
  const thresholds = getThresholds(args);
  const coverageStr = await collectCoverage();
  const coverage = calculateCoverageSummary(parseLcov(coverageStr));

  // console.log(coverageStr);
  console.log(formatCoverageSummary(coverage));
  const result = checkThresholds(coverage, thresholds);
  const statusCode = result.passed ? 0 : 1;
  result.failures.forEach(line => console.error(line));
  
  Deno.exit(statusCode);
}

main();
