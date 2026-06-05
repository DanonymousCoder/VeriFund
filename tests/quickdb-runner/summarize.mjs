/** Print the latest quick.db runs as a compact scoreboard. */
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { QuickDB } from "quick.db";

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new QuickDB({ filePath: join(__dirname, "data", "verifund-endpoint-runs.sqlite") });
const index = (await db.get("runIndex")) || [];
const latestRun = await db.get("latestRun");
const latestSummary = await db.get("latestSummary");

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
};

function color(code, text) {
  return `${code}${text}${C.reset}`;
}

function badge(pass) {
  return pass ? color(C.green, "[PASS]") : color(C.red, "[FAIL]");
}

function bar(percent, width = 20) {
  const filled = Math.round((percent / 100) * width);
  return `[${"#".repeat(Math.max(0, filled))}${"-".repeat(Math.max(0, width - filled))}]`;
}

function printCategoryBreakdown(categories = {}) {
  const rows = Object.entries(categories);
  if (!rows.length) {
    console.log(color(C.dim, "  No category data recorded."));
    return;
  }

  for (const [name, stats] of rows) {
    const rate = stats.total ? Math.round((stats.passed / stats.total) * 1000) / 10 : 0;
    console.log(`  ${name.padEnd(14)} ${badge(stats.failed === 0)} ${stats.passed}/${stats.total} ${bar(rate, 14)} ${rate}%`);
  }
}

for (const runId of index.slice(-5)) {
  const summary = await db.get(`runs.${runId}`);
  const results = (await db.get(`results.${runId}`)) || [];
  const failed = results.filter((r) => !r.pass);
  console.log("\n" + "=".repeat(72));
  console.log(color(C.bold, `${runId}`));
  console.log(`Env      : ${summary?.env || "unknown"}`);
  console.log(`Result   : ${badge((summary?.failed || 0) === 0)} ${summary?.passed ?? 0}/${summary?.total ?? 0} passed`);
  if (summary?.at) console.log(`When     : ${summary.at}`);
  if (summary?.durationMs != null) console.log(`Duration : ${summary.durationMs} ms`);
  if (summary?.passRate != null) console.log(`Pass rate: ${summary.passRate}%`);
  console.log(`Progress : ${bar(summary?.passRate || 0)} ${summary?.passRate || 0}%`);
  console.log(color(C.bold, "Category Breakdown"));
  printCategoryBreakdown(summary?.categories);
  if (failed.length) {
    console.log(color(C.bold, "Failures"));
    for (const f of failed) console.log(`  - ${f.name}: expected ${f.expected}, got ${f.actual}`);
  }
}

if (latestRun && latestSummary) {
  console.log("\n" + "=".repeat(72));
  console.log(color(C.bold, "Latest Snapshot"));
  console.log(`Run      : ${latestRun}`);
  console.log(`Passed   : ${latestSummary.passed}/${latestSummary.total}`);
  console.log(`Rate     : ${latestSummary.passRate}%`);
  console.log(`Duration : ${latestSummary.durationMs} ms`);
}
