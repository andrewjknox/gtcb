#!/usr/bin/env node
// Build step — deterministic analyst. Computes data/summary/<week>.json from
// data/raw/<week>.json + data/plan.json (schema in CLAUDE.md) and updates
// data/summary/index.json. Same math as scripts/reconcile.mjs (which Gate B
// uses to verify this output), so summary generation and verification can
// never drift apart. Dependency-free Node. Exit 0 = written, 2 = failed.
//
// Module use:   import { buildSummary } from "./summary.mjs";
// CLI use:      node scripts/build/summary.mjs 2026-W29   (from repo root)
//
// Flags emitted (deterministic):
//   calf    — any activity whose description or name mentions "calf"
//             (left-calf rehab is active; CLAUDE.md requires these surfaced)
//   missed_session — not emitted: plan.json has no per-session schedule to
//             compare against, so there is nothing deterministic to compute
//   (Walk activities are never flagged: labels are trusted as-is, owner
//    decision 2026-07-16 — a Walk is a Walk and simply doesn't count.)

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { reconcileWeek, parseLocalIso, nowLondonKey } from "../reconcile.mjs";

function round(n) {
  return Math.round(n);
}

// Days Mon..today inclusive in Europe/London, clamped to 1..7.
function daysElapsed(windowStart, nowKey) {
  const today = parseLocalIso(`${nowKey.slice(0, 10)}T00:00:00`);
  const days = Math.floor((today.utc - windowStart.utc) / 86400000) + 1;
  return Math.min(7, Math.max(1, days));
}

function calfFlags(activities) {
  const flags = [];
  for (const a of activities) {
    const date = typeof a.start_date_local === "string" ? a.start_date_local.slice(0, 10) : "?";
    const desc = typeof a.description === "string" ? a.description : "";
    if (/calf/i.test(desc)) {
      const sentence =
        desc.split(/(?<=[.!?…])\s+/).find((s) => /calf/i.test(s))?.trim() ?? desc.trim();
      flags.push({ type: "calf", detail: `"${sentence}" — "${a.name}", ${date}` });
    } else if (/calf/i.test(a.name ?? "")) {
      flags.push({ type: "calf", detail: `Activity name mentions calf: "${a.name}", ${date}` });
    }
  }
  return flags;
}

/**
 * Compute a summary document from a parsed raw week + plan.
 * @param {object} raw   parsed data/raw/YYYY-Www.json
 * @param {object} plan  parsed data/plan.json
 * @param {object} [opts] { nowKey, generatedAt } overrides for testing
 */
export function buildSummary(raw, plan, opts = {}) {
  const rec = reconcileWeek(raw, plan);
  if (rec.training_week === null || rec.vert_target_m === null) {
    throw new Error(`iso_week ${raw.iso_week} not found in plan.json`);
  }
  const start = parseLocalIso(raw.window.start);
  const nowKey = opts.nowKey ?? nowLondonKey();
  const de = daysElapsed(start, nowKey);
  const target = rec.vert_target_m;
  const prorated = round((target * de) / 7);
  const activities = Array.isArray(raw.activities) ? raw.activities : [];

  return {
    iso_week: raw.iso_week,
    training_week: rec.training_week,
    phase: rec.phase,
    generated_at: opts.generatedAt ?? new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    window: { start: raw.window.start, end: raw.window.end, tz: raw.window.tz },
    days_elapsed: de,
    vert: {
      actual_m: rec.vert_actual_m,
      target_m: target,
      prorated_target_m: prorated,
      pct_of_target: target === 0 ? 0 : round((100 * rec.vert_actual_m) / target),
      pct_of_prorated: prorated === 0 ? 0 : round((100 * rec.vert_actual_m) / prorated),
    },
    time_on_feet: { actual_s: rec.time_on_feet_s },
    distance: { actual_m: rec.distance_m },
    sessions: { count: rec.sessions_count, on_foot_count: rec.on_foot_count },
    daily: rec.daily,
    flags: calfFlags(activities),
  };
}

// ---------- CLI ----------

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const week = process.argv[2];
  if (!/^\d{4}-W\d{2}$/.test(week ?? "")) {
    console.error("usage: node scripts/build/summary.mjs <iso-week>   e.g. 2026-W29");
    process.exit(2);
  }
  let summary;
  try {
    const raw = JSON.parse(readFileSync(`data/raw/${week}.json`, "utf8"));
    const plan = JSON.parse(readFileSync("data/plan.json", "utf8"));
    summary = buildSummary(raw, plan);
  } catch (e) {
    console.error(`summary: ${e.message}`);
    process.exit(2);
  }
  writeFileSync(`data/summary/${week}.json`, `${JSON.stringify(summary, null, 2)}\n`);

  // index.json = exactly the summary files present, sorted (Gate B check 7)
  const weeks = readdirSync("data/summary")
    .filter((f) => /^\d{4}-W\d{2}\.json$/.test(f))
    .map((f) => f.replace(/\.json$/, ""))
    .sort();
  writeFileSync("data/summary/index.json", `${JSON.stringify({ weeks }, null, 2)}\n`);

  console.log(
    `summary: data/summary/${week}.json written — vert ${summary.vert.actual_m}m ` +
    `(${summary.vert.pct_of_prorated}% of prorated), ${summary.flags.length} flag(s); ` +
    `index.json ${weeks.length} weeks`
  );
}
