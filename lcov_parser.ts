import { Table } from "@sauber/table";

type CoverageData = {
  title?: string;
  file: string;
  lines: {
    found: number;
    hit: number;
    details: Array<{
      line: number;
      hit: number;
    }>;
  };
  functions: {
    found: number;
    hit: number;
    details: Array<{
      name: string;
      line: number;
      hit: number;
    }>;
  };
  branches: {
    found: number;
    hit: number;
    details: Array<{
      line: number;
      block: number;
      branch: number;
      taken: number;
    }>;
  };
};

export type Config = {
  lines?: number;
  functions?: number;
  branches?: number;
  perFile?: boolean;
  exclude?: string;
  include?: string;
};

type CoverageMetric = {
  lines: { total: number; covered: number; percentage: number };
  functions: { total: number; covered: number; percentage: number };
  branches: { total: number; covered: number; percentage: number };
}

type CoverageSummary = {
  total: CoverageMetric;
  files: Record<string, CoverageMetric>;
};

/**
 * Parse LCOV data from string content
 */
export function parseLcov(lcovContent: string): CoverageData[] {
  const data: CoverageData[] = [];
  let current: Partial<CoverageData> = {};

  // Split the content by lines
  const lines = lcovContent.split("\n");

  for (const line of lines) {
    // Skip empty lines
    if (!line.trim()) continue;

    // Parse each line based on its prefix
    const [prefix, ...values] = line.split(":");
    const value = values.join(":").trim();

    switch (prefix) {
      case "TN": // Test Name
        current.title = value;
        break;
      case "SF": // Source File
        current.file = value;
        // Initialize the coverage data structure
        current.lines = { found: 0, hit: 0, details: [] };
        current.functions = { found: 0, hit: 0, details: [] };
        current.branches = { found: 0, hit: 0, details: [] };
        break;
      case "FNF": // Functions Found
        if (current.functions) current.functions.found = parseInt(value, 10);
        break;
      case "FNH": // Functions Hit
        if (current.functions) current.functions.hit = parseInt(value, 10);
        break;
      case "FN": // Function Names
        if (current.functions) {
          const [line, name] = value.split(",", 2);
          current.functions.details.push({
            name,
            line: parseInt(line, 10),
            hit: 0,
          });
        }
        break;
      case "FNDA": // Function Data
        if (current.functions) {
          const [hits, name] = value.split(",", 2);
          const fnIndex = current.functions.details.findIndex(
            (fn) => fn.name === name
          );
          if (fnIndex >= 0) {
            current.functions.details[fnIndex].hit = parseInt(hits, 10);
          }
        }
        break;
      case "LF": // Lines Found
        if (current.lines) current.lines.found = parseInt(value, 10);
        break;
      case "LH": // Lines Hit
        if (current.lines) current.lines.hit = parseInt(value, 10);
        break;
      case "DA": // Line Data
        if (current.lines) {
          const [line, hit] = value.split(",", 2);
          current.lines.details.push({
            line: parseInt(line, 10),
            hit: parseInt(hit, 10),
          });
        }
        break;
      case "BRF": // Branches Found
        if (current.branches) current.branches.found = parseInt(value, 10);
        break;
      case "BRH": // Branches Hit
        if (current.branches) current.branches.hit = parseInt(value, 10);
        break;
      case "BRDA": // Branch Data
        if (current.branches) {
          const [line, block, branch, taken] = value.split(",", 4);
          current.branches.details.push({
            line: parseInt(line, 10),
            block: parseInt(block, 10),
            branch: parseInt(branch, 10),
            taken: taken === "-" ? 0 : parseInt(taken, 10),
          });
        }
        break;
      case "end_of_record":
        // Add the current record to our data array and reset
        if (current.file) {
          data.push(current as CoverageData);
        }
        current = {};
        break;
    }
  }

  return data;
}

/**
 * Calculate coverage summary from parsed LCOV data
 */
export function calculateCoverageSummary(
  coverageData: CoverageData[]
): CoverageSummary {
  const summary: CoverageSummary = {
    total: {
      lines: { total: 0, covered: 0, percentage: 100 },
      functions: { total: 0, covered: 0, percentage: 100 },
      branches: { total: 0, covered: 0, percentage: 100 },
    },
    files: {},
  };

  // Calculate coverage for each file
  for (const fileData of coverageData) {
    const fileSummary = {
      lines: {
        total: fileData.lines.found,
        covered: fileData.lines.hit,
        percentage:
          fileData.lines.found > 0
            ? (fileData.lines.hit / fileData.lines.found) * 100
            : 100,
      },
      functions: {
        total: fileData.functions.found,
        covered: fileData.functions.hit,
        percentage:
          fileData.functions.found > 0
            ? (fileData.functions.hit / fileData.functions.found) * 100
            : 100,
      },
      branches: {
        total: fileData.branches.found,
        covered: fileData.branches.hit,
        percentage:
          fileData.branches.found > 0
            ? (fileData.branches.hit / fileData.branches.found) * 100
            : 100,
      },
    };

    summary.files[fileData.file] = fileSummary;

    // Add to totals
    summary.total.lines.total += fileSummary.lines.total;
    summary.total.lines.covered += fileSummary.lines.covered;
    summary.total.functions.total += fileSummary.functions.total;
    summary.total.functions.covered += fileSummary.functions.covered;
    summary.total.branches.total += fileSummary.branches.total;
    summary.total.branches.covered += fileSummary.branches.covered;
  }

  // Calculate overall percentages
  if (summary.total.lines.total > 0) {
    summary.total.lines.percentage =
      (summary.total.lines.covered / summary.total.lines.total) * 100;
  }
  if (summary.total.functions.total > 0) {
    summary.total.functions.percentage =
      (summary.total.functions.covered / summary.total.functions.total) * 100;
  }
  if (summary.total.branches.total > 0) {
    summary.total.branches.percentage =
      (summary.total.branches.covered / summary.total.branches.total) * 100;
  }

  return summary;
}

/**
 * Check if coverage meets the specified thresholds
 */
export function checkThresholds(
  summary: CoverageSummary,
  thresholds: Config
): { passed: boolean; failures: string[] } {
  const failures: string[] = [];

  // Check global thresholds
  if (thresholds.lines !== undefined && summary.total.lines.percentage < thresholds.lines) {
    failures.push(
      `Lines coverage ${summary.total.lines.percentage.toFixed(2)}% is below threshold ${thresholds.lines}%`
    );
  }

  if (thresholds.functions !== undefined && summary.total.functions.percentage < thresholds.functions) {
    failures.push(
      `Functions coverage ${summary.total.functions.percentage.toFixed(2)}% is below threshold ${thresholds.functions}%`
    );
  }

  if (thresholds.branches !== undefined && summary.total.branches.percentage < thresholds.branches) {
    failures.push(
      `Branches coverage ${summary.total.branches.percentage.toFixed(2)}% is below threshold ${thresholds.branches}%`
    );
  }

  // Check per-file thresholds if enabled
  if (thresholds.perFile) {
    for (const [file, fileSummary] of Object.entries(summary.files)) {
      if (thresholds.lines !== undefined && fileSummary.lines.percentage < thresholds.lines) {
        failures.push(
          `File ${file}: Lines coverage ${fileSummary.lines.percentage.toFixed(2)}% is below threshold ${thresholds.lines}%`
        );
      }

      if (thresholds.functions !== undefined && fileSummary.functions.percentage < thresholds.functions) {
        failures.push(
          `File ${file}: Functions coverage ${fileSummary.functions.percentage.toFixed(2)}% is below threshold ${thresholds.functions}%`
        );
      }

      if (thresholds.branches !== undefined && fileSummary.branches.percentage < thresholds.branches) {
        failures.push(
          `File ${file}: Branches coverage ${fileSummary.branches.percentage.toFixed(2)}% is below threshold ${thresholds.branches}%`
        );
      }
    }
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

const formatCoverageMetricRow = (metric: CoverageMetric) => {
  const branch = metric.branches.percentage.toFixed();
  const lines = metric.lines.percentage.toFixed();
  const functions = metric.functions.percentage.toFixed();

  return [branch, lines, functions];
}

/**
 * Generate a prettified table of coverage results
 */
export function formatCoverageSummary(
  summary: CoverageSummary,
): string {
  const table = new Table();
  table.theme = Table.roundTheme;
  table.headers = ["File", "Branch", "Line", "Function"];
  const { total } = summary;
  table.rows = Object.entries(summary.files)
    .map(([file, fileSummary]) => {
      const shortFile = file.split("/").pop() || file;
      return [shortFile, ...formatCoverageMetricRow(fileSummary)];
    });
  
    table.rows.push([
    "Total", 
    ...formatCoverageMetricRow(total)
  ]);
  
  return table.toString();
}