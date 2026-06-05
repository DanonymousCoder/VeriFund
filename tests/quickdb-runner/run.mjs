/**
 * VeriFund full endpoint smoke test with quick.db persistence.
 *
 * Usage:
 *   npm install
 *   npm run test:local
 *   npm run test:production
 *
 * Env:
 *   GATEWAY_URL   — API base (default http://127.0.0.1:8000)
 *   AI_URL        — defaults to GATEWAY_URL (use gateway proxy in production)
 *   NOTIFY_URL    — defaults to GATEWAY_URL
 *   TEST_ENV      — label stored in quick.db (local | production)
 *   SQUAD_TEST_BVN
 *   DATABASE_URL  — optional Postgres URL to seed executive signers (full withdrawal flow)
 * 
 * quick.db itself is local and file-backed. It does not need extra env vars.
 */

import { createHash, randomUUID } from "crypto";
import { existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { QuickDB } from "quick.db";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "data");
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

const GATEWAY_URL = (process.env.GATEWAY_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
const AI_URL = (process.env.AI_URL || GATEWAY_URL).replace(/\/$/, "");
const NOTIFY_URL = (process.env.NOTIFY_URL || GATEWAY_URL).replace(/\/$/, "");
const TEST_ENV = process.env.TEST_ENV || "local";
const SQUAD_TEST_BVN = process.env.SQUAD_TEST_BVN || "22222222222";
const DATABASE_URL = (process.env.DATABASE_URL || "").trim();

const db = new QuickDB({ filePath: join(dataDir, "verifund-endpoint-runs.sqlite") });

const runId = `${TEST_ENV}-${Date.now()}`;
const startedAt = Date.now();
const results = [];
let failures = 0;

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

function printScoreboard(summary) {
  const passed = summary.passed ?? 0;
  const total = summary.total ?? 0;
  const passRate = summary.passRate ?? 0;
  const failed = summary.failed ?? 0;
  const statusLabel = failed === 0 ? color(C.green, "HEALTHY") : color(C.yellow, "DEGRADED");

  console.log("");
  console.log(color(C.bold, "VERIFUND QA SCOREBOARD"));
  console.log(color(C.dim, "========================================"));
  console.log(`Run      : ${summary.runId}`);
  console.log(`Env      : ${summary.env}`);
  console.log(`Status   : ${statusLabel}`);
  console.log(`Result   : ${badge(failed === 0)} ${passed}/${total} passed (${passRate}%)`);
  console.log(`Duration : ${summary.durationMs} ms`);
  console.log(`Gateway  : ${summary.gateway}`);
  console.log(`Progress : ${bar(passRate)} ${passRate}%`);
  console.log("");
  console.log(color(C.bold, "CATEGORY BREAKDOWN"));

  const categories = summary.categories || {};
  const names = Object.keys(categories);
  if (!names.length) {
    console.log(color(C.dim, "  No category data recorded."));
    return;
  }

  for (const name of names) {
    const stats = categories[name];
    const rate = stats.total ? Math.round((stats.passed / stats.total) * 1000) / 10 : 0;
    console.log(`  ${name.padEnd(14)} ${badge(stats.failed === 0)} ${stats.passed}/${stats.total} ${bar(rate, 14)} ${rate}%`);
  }

  console.log("");
  console.log(color(C.dim, `Saved to quick.db: ${join(dataDir, "verifund-endpoint-runs.sqlite")}`));
}

function uniquePhone(suffix) {
  const digits = suffix.replace(/\D/g, "");
  return `08${digits.slice(-9).padStart(9, "0")}`;
}

function categoryForName(name) {
  const head = name.split(" ")[0]?.toLowerCase() || "other";
  return {
    api: "gateway",
    auth: "auth",
    members: "members",
    cooperatives: "cooperatives",
    virtual: "contributions",
    contribution: "contributions",
    squad: "webhooks",
    withdrawal: "withdrawals",
    ai: "ai",
    notify: "notifications",
    health: "health",
  }[head] || head;
}

function summarizeByCategory(items) {
  const buckets = new Map();
  for (const item of items) {
    const category = item.category || "other";
    const current = buckets.get(category) || { total: 0, passed: 0, failed: 0 };
    current.total += 1;
    current.passed += item.pass ? 1 : 0;
    current.failed += item.pass ? 0 : 1;
    buckets.set(category, current);
  }
  return Object.fromEntries([...buckets.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

async function requestJson(method, url, { headers = {}, payload } = {}) {
  const init = { method: method.toUpperCase(), headers: { ...headers } };
  if (payload !== undefined) {
    init.body = JSON.stringify(payload);
    init.headers["Content-Type"] = "application/json";
  }
  const started = Date.now();
  let response;
  try {
    response = await fetch(url, init);
  } catch (err) {
    return {
      ok: false,
      status: 0,
      ms: Date.now() - started,
      body: { error: String(err) },
      text: String(err),
    };
  }
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text.slice(0, 500) };
  }
  return {
    ok: response.ok,
    status: response.status,
    ms: Date.now() - started,
    body,
    text: text.slice(0, 500),
  };
}

async function check(name, method, url, expected, options = {}) {
  const res = await requestJson(method, url, options);
  const pass = res.status === expected;
  if (!pass) failures += 1;
  const entry = {
    name,
    category: categoryForName(name),
    method,
    url,
    expected,
    actual: res.status,
    pass,
    ms: res.ms,
    snippet: res.text?.slice(0, 200) ?? "",
  };
  results.push(entry);
  console.log(`${badge(pass)} ${name} -> ${res.status} (${res.ms}ms)`);
  if (!pass) console.log(`       body: ${entry.snippet}`);
  return { pass, data: res.body, status: res.status };
}

async function seedMemberFromTemplate(templateMemberId, suffix, role) {
  if (!DATABASE_URL) return null;
  let pg;
  try {
    pg = await import("pg");
  } catch {
    console.log("[skip] withdrawal signers: install pg or set DATABASE_URL for DB seeding");
    return null;
  }
  const client = new pg.default.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const template = await client.query("SELECT password_hash FROM members WHERE id = $1", [templateMemberId]);
  if (!template.rows.length) {
    await client.end();
    return null;
  }
  const memberId = randomUUID();
  const phone = uniquePhone(suffix);
  const email = `seed-${suffix}@verifund.local`;
  const bvnHash = createHash("sha256").update(`seed-${suffix}`).digest("hex");
  await client.query(
    `INSERT INTO members (id, bvn_hash, first_name, last_name, phone_number, email, password_hash, bvn_verified, bvn_verified_at, role, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [memberId, bvnHash, `Seed${suffix}`, "User", phone, email, template.rows[0].password_hash, false, null, role, true]
  );
  await client.end();
  return { id: memberId, phone_number: phone, email };
}

async function promoteMember(memberId, role) {
  if (!DATABASE_URL) return;
  const pg = await import("pg");
  const client = new pg.default.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query("UPDATE members SET role = $1 WHERE id = $2", [role, memberId]);
  await client.end();
}

async function login(phone) {
  const r = await check(
    `login ${phone}`,
    "POST",
    `${GATEWAY_URL}/api/auth/login/`,
    200,
    { payload: { phone_number: phone, password: "Passw0rd!123" } }
  );
  return r.data?.token;
}

async function main() {
  console.log(`\nVeriFund endpoint run: ${runId}`);
  console.log(`  env=${TEST_ENV} gateway=${GATEWAY_URL} ai=${AI_URL} notify=${NOTIFY_URL}\n`);

  await check("health", "GET", `${GATEWAY_URL}/health/`, 200);
  await check("api health", "GET", `${GATEWAY_URL}/api/health/`, 200);

  const suffix = randomUUID().slice(0, 8);
  const phone1 = uniquePhone(`${suffix}01`);
  const runBvn = `22${suffix.replace(/\D/g, "").padEnd(9, "0").slice(0, 9)}`;

  const reg = await check("auth register", "POST", `${GATEWAY_URL}/api/auth/register/`, 201, {
    payload: {
      bvn: runBvn,
      first_name: `Test${suffix}`,
      last_name: "User",
      phone_number: phone1,
      email: `test-${suffix}@verifund.local`,
      password: "Passw0rd!123",
    },
  });
  const member1 = reg.data?.member;

  await promoteMember(member1?.id, "ADMIN");

  const admin2 = await seedMemberFromTemplate(member1?.id, `${suffix}02`, "ADMIN");
  const admin3 = await seedMemberFromTemplate(member1?.id, `${suffix}03`, "ADMIN");
  const token1 = await login(phone1);
  const token2 = admin2 ? await login(admin2.phone_number) : null;
  const token3 = admin3 ? await login(admin3.phone_number) : null;

  const auth = (t) => ({ headers: { Authorization: `Bearer ${t}` } });

  await check("members me", "GET", `${GATEWAY_URL}/api/members/me/`, 200, auth(token1));
  await check("members patch", "PATCH", `${GATEWAY_URL}/api/members/me/`, 200, {
    ...auth(token1),
    payload: { first_name: `Updated${suffix}`, email: `updated-${suffix}@verifund.local` },
  });

  const coop = await check("cooperatives create", "POST", `${GATEWAY_URL}/api/cooperatives/`, 201, {
    payload: {
      name: `VeriFund Coop ${suffix}`,
      registration_number: `REG-${suffix}`,
      state: "Lagos",
      cooperative_type: "MULTIPURPOSE",
      treasurer_bvn: SQUAD_TEST_BVN,
    },
  });
  const cooperativeId = coop.data?.id;

  await check("cooperative detail", "GET", `${GATEWAY_URL}/api/cooperatives/${cooperativeId}/`, 200);
  await check("trust score", "GET", `${GATEWAY_URL}/api/cooperatives/${cooperativeId}/trust-score/`, 200);
  await check(
    "regulator summary",
    "GET",
    `${GATEWAY_URL}/api/cooperatives/${cooperativeId}/regulator-summary/`,
    200
  );

  const va = await check("virtual account create", "POST", `${GATEWAY_URL}/api/contributions/virtual-account/`, 201, {
    ...auth(token1),
    payload: {
      cooperative_id: cooperativeId,
      bvn: runBvn,
      dob: "07/19/1990",
      address: "22 Marina Road, Lagos",
      gender: "1",
      phone_number: phone1,
      email: `test-${suffix}@verifund.local`,
    },
  });
  const virtualAccount = va.data?.virtual_account;

  await check(
    "virtual account list",
    "GET",
    `${GATEWAY_URL}/api/contributions/virtual-account/list/`,
    200,
    auth(token1)
  );
  await check(
    "virtual account simulate",
    "POST",
    `${GATEWAY_URL}/api/contributions/virtual-account/simulate/`,
    200,
    { ...auth(token1), payload: { cooperative_id: cooperativeId, amount_kobo: 500000 } }
  );

  const webhookRef = `WEB-${suffix}`;
  await check("squad webhook", "POST", `${GATEWAY_URL}/api/webhooks/squad/`, 200, {
    payload: {
      Event: "charge_successful",
      TransactionRef: webhookRef,
      Body: {
        transaction_reference: webhookRef,
        virtual_account_number: virtualAccount?.virtual_account_number || "9013151601",
        principal_amount: "7000.00",
        settled_amount: "7000.00",
        currency: "NGN",
        customer_identifier: virtualAccount?.customer_identifier || "VF-TEST",
      },
    },
  });

  await check("contribution history", "GET", `${GATEWAY_URL}/api/contributions/history/`, 200, auth(token1));
  await check(
    "contribution audit",
    "GET",
    `${GATEWAY_URL}/api/contributions/audit/${cooperativeId}/`,
    200,
    auth(token1)
  );
  await check(
    "webhook events",
    "GET",
    `${GATEWAY_URL}/api/contributions/webhooks/events/`,
    200,
    auth(token1)
  );

  await check("withdrawal lookup", "POST", `${GATEWAY_URL}/api/withdrawals/lookup/`, 200, {
    ...auth(token1),
    payload: { destination_bank_code: "000013", destination_account: "0123456789" },
  });

  const withdrawal = await check("withdrawal request", "POST", `${GATEWAY_URL}/api/withdrawals/request/`, 201, {
    ...auth(token1),
    payload: {
      cooperative_id: cooperativeId,
      amount_kobo: 100000,
      destination_account: "0123456789",
      destination_bank_code: "000013",
      purpose: "QuickDB endpoint test",
    },
  });
  const withdrawalId = withdrawal.data?.id;

  await check(
    "withdrawal detail",
    "GET",
    `${GATEWAY_URL}/api/withdrawals/${withdrawalId}/`,
    200,
    auth(token1)
  );
  await check(
    "withdrawal pending",
    "GET",
    `${GATEWAY_URL}/api/withdrawals/pending/?cooperative_id=${cooperativeId}`,
    200,
    auth(token1)
  );

  if (token2 && token3) {
    await check(
      "withdrawal sign executive1",
      "POST",
      `${GATEWAY_URL}/api/withdrawals/${withdrawalId}/sign/`,
      200,
      { ...auth(token2), payload: { role: "EXECUTIVE1" } }
    );
    await check(
      "withdrawal sign executive2",
      "POST",
      `${GATEWAY_URL}/api/withdrawals/${withdrawalId}/sign/`,
      200,
      { ...auth(token3), payload: { role: "EXECUTIVE2" } }
    );
    await check(
      "withdrawal requery",
      "POST",
      `${GATEWAY_URL}/api/withdrawals/${withdrawalId}/requery/`,
      200,
      auth(token1)
    );
  } else {
    console.log("[skip] withdrawal sign/requery — set DATABASE_URL to seed executive signers");
  }

  await check("ai score transaction", "POST", `${AI_URL}/api/ai/score-transaction/`, 200, {
    payload: {
      amount_kobo: 500000,
      rolling_90d_mean: 300000,
      days_since_last_contribution: 12,
      member_transaction_count: 7,
      cooperative_flagged_rate: 0.05,
    },
  });
  await check("ai score cooperative post", "POST", `${AI_URL}/api/ai/score-cooperative/`, 200, {
    payload: { cooperative_id: cooperativeId, breakdown: { member_churn_rate: 0.1 } },
  });
  await check(
    "ai score cooperative get",
    "GET",
    `${AI_URL}/api/ai/score-cooperative/${cooperativeId}/`,
    200
  );
  await check("ai triage report", "POST", `${AI_URL}/api/ai/triage-report/`, 200, {
    payload: {
      report_text: "Suspicious withdrawal missing 50000",
      reporter_cooperative_id: cooperativeId,
    },
  });
  await check("ai analyze graph post", "POST", `${AI_URL}/api/ai/analyze-graph/`, 200, {
    payload: { cooperative_id: cooperativeId },
  });
  await check("ai analyze graph get", "GET", `${AI_URL}/api/ai/analyze-graph/${cooperativeId}/`, 200);
  await check("ai health scores", "GET", `${AI_URL}/api/ai/health-scores/`, 200);
  await check("ai health scores all", "GET", `${AI_URL}/api/ai/health-scores/all/`, 200);

  await check("notify email", "POST", `${NOTIFY_URL}/api/notify/email/`, 200, {
    payload: {
      email: `quickdb-${suffix}@verifund.local`,
      subject: "VeriFund quick.db test",
      message: `Run ${runId}`,
    },
  });
  await check("notify history", "GET", `${NOTIFY_URL}/api/notify/history/?limit=5`, 200);

  const summary = {
    runId,
    env: TEST_ENV,
    gateway: GATEWAY_URL,
    at: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    total: results.length,
    passed: results.filter((r) => r.pass).length,
    failed: failures,
    passRate: results.length ? Math.round((results.filter((r) => r.pass).length / results.length) * 1000) / 10 : 0,
    categories: summarizeByCategory(results),
    cooperativeId,
    withdrawalId,
    memberId: member1?.id,
  };

  await db.set(`runs.${runId}`, summary);
  await db.set(`results.${runId}`, results);
  await db.set(`session.${TEST_ENV}`, {
    token: token1,
    cooperativeId,
    withdrawalId,
    memberId: member1?.id,
    updatedAt: summary.at,
  });
  await db.set("latestRun", runId);
  await db.set("latestSummary", summary);
  await db.push(`runsByEnv.${TEST_ENV}`, runId);
  await db.push("runIndex", runId);

  printScoreboard(summary);
  console.log("");
  console.log(color(C.dim, "Raw summary:"));
  console.log(JSON.stringify(summary, null, 2));

  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
