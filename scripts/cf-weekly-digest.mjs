#!/usr/bin/env node
// Weekly CF analytics digest for whistlerbrew.com
//
// Usage:
//   node scripts/cf-weekly-digest.mjs              # print to stdout
//   node scripts/cf-weekly-digest.mjs --obsidian   # also save to Obsidian vault
//   node scripts/cf-weekly-digest.mjs --append     # append to today's daily note
//
// Token: secrets/api-keys.json → .cloudflare.analytics_token

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { cloudflare } = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "secrets", "api-keys.json"), "utf8")
);
const TOKEN = cloudflare.analytics_token;

const ZONE_ID = "c15627b6487fd580bebdcb5df407936f";
const ACCOUNT_ID = "9501eaa888ac0e2cd5766bd98bcf0feb";
const HOST = "whistlerbrew.com";
const VAULT = "/Users/mbrew/Documents/Brew-Vault";
const REPORTS_DIR = path.join(VAULT, "04-Projects", "whistlerbrew-traffic");

const args = new Set(process.argv.slice(2));
const flagObsidian = args.has("--obsidian");
const flagAppend = args.has("--append");

const days = 7;
const since = new Date(Date.now() - days * 86400000).toISOString();
const until = new Date().toISOString();
const sinceDate = since.slice(0, 10);
const untilDate = until.slice(0, 10);

// ISO week number for filename
function isoWeek(d) {
  const date = new Date(d);
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
const weekTag = isoWeek(new Date());

async function gql(query) {
  const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const j = await res.json();
  if (j.errors) {
    console.error(JSON.stringify(j.errors, null, 2));
    process.exit(1);
  }
  return j.data;
}

const rumQ = `{
  viewer {
    accounts(filter: { accountTag: "${ACCOUNT_ID}" }) {
      totals: rumPageloadEventsAdaptiveGroups(limit: 1, filter: { datetime_geq: "${since}", datetime_leq: "${until}", requestHost: "${HOST}" }) { count sum { visits } }
      byPath: rumPageloadEventsAdaptiveGroups(limit: 30, filter: { datetime_geq: "${since}", datetime_leq: "${until}", requestHost: "${HOST}" }, orderBy: [count_DESC]) { count sum { visits } dimensions { requestPath countryName } }
      byCountry: rumPageloadEventsAdaptiveGroups(limit: 15, filter: { datetime_geq: "${since}", datetime_leq: "${until}", requestHost: "${HOST}" }, orderBy: [count_DESC]) { count dimensions { countryName } }
      byReferer: rumPageloadEventsAdaptiveGroups(limit: 10, filter: { datetime_geq: "${since}", datetime_leq: "${until}", requestHost: "${HOST}", refererHost_neq: "" }, orderBy: [count_DESC]) { count dimensions { refererHost } }
      byDevice: rumPageloadEventsAdaptiveGroups(limit: 5, filter: { datetime_geq: "${since}", datetime_leq: "${until}", requestHost: "${HOST}" }, orderBy: [count_DESC]) { count dimensions { deviceType } }
    }
  }
}`;

const httpQ = `{
  viewer {
    zones(filter: { zoneTag: "${ZONE_ID}" }) {
      httpRequests1dGroups(limit: ${days}, filter: { date_geq: "${sinceDate}", date_leq: "${untilDate}" }, orderBy: [date_ASC]) {
        dimensions { date }
        sum { requests cachedRequests bytes threats pageViews }
        uniq { uniques }
      }
    }
  }
}`;

const [rum, http] = await Promise.all([gql(rumQ), gql(httpQ)]);
const a = rum.viewer.accounts[0];
const days_data = http.viewer.zones[0].httpRequests1dGroups;

const totals = days_data.reduce(
  (acc, d) => ({
    requests: acc.requests + d.sum.requests,
    cached: acc.cached + d.sum.cachedRequests,
    bytes: acc.bytes + d.sum.bytes,
    threats: acc.threats + d.sum.threats,
  }),
  { requests: 0, cached: 0, bytes: 0, threats: 0 }
);

// Aggregate by path (sum across countries)
const pathMap = new Map();
for (const r of a.byPath) {
  const p = r.dimensions.requestPath;
  const cur = pathMap.get(p) || { count: 0, visits: 0, countries: new Set() };
  cur.count += r.count;
  cur.visits += r.sum.visits;
  cur.countries.add(r.dimensions.countryName);
  pathMap.set(p, cur);
}
const paths = [...pathMap.entries()]
  .sort((a, b) => b[1].count - a[1].count)
  .slice(0, 15);

// External vs CA split (CA = Mike)
const totalViews = a.totals[0]?.count || 0;
const totalVisits = a.totals[0]?.sum.visits || 0;
const caViews = a.byCountry.find((c) => c.dimensions.countryName === "CA")?.count || 0;
const externalViews = totalViews - caViews;
const externalCountries = a.byCountry.filter((c) => c.dimensions.countryName !== "CA");

const md = `# Weekly Traffic — ${weekTag}
**whistlerbrew.com · ${sinceDate} → ${untilDate}**

## TL;DR
- **Real human page views:** ${totalViews}  ·  **Visits (sessions):** ${totalVisits}
- **External (non-Canada):** ${externalViews} views from ${externalCountries.length} countries
- **Edge requests (incl. bots):** ${totals.requests.toLocaleString()}  ·  **Bandwidth:** ${(totals.bytes / 1e9).toFixed(1)} GB  ·  **Threats blocked:** ${totals.threats}

## Top Pages
| Path | Views | Visits | Countries |
|------|------:|-------:|----------:|
${paths.map(([p, d]) => `| \`${p}\` | ${d.count} | ${d.visits} | ${d.countries.size} |`).join("\n")}

## Countries
${a.byCountry.map((c) => `- ${c.dimensions.countryName}: ${c.count}${c.dimensions.countryName === "CA" ? " *(Mike)*" : ""}`).join("\n")}

## Referrers
${a.byReferer.length ? a.byReferer.map((r) => `- ${r.dimensions.refererHost}: ${r.count}`).join("\n") : "*(none — direct/internal traffic only)*"}

## Devices
${a.byDevice.map((d) => `- ${d.dimensions.deviceType}: ${d.count}`).join("\n")}

## Daily Edge Traffic
| Date | Requests | Page Views | Unique IPs | Bandwidth |
|------|---------:|-----------:|-----------:|----------:|
${days_data.map((d) => `| ${d.dimensions.date} | ${d.sum.requests.toLocaleString()} | ${d.sum.pageViews} | ${d.uniq.uniques} | ${(d.sum.bytes / 1e9).toFixed(2)} GB |`).join("\n")}

---
*Generated ${new Date().toISOString()} via \`scripts/cf-weekly-digest.mjs\`*
`;

console.log(md);

if (flagObsidian) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const file = path.join(REPORTS_DIR, `${weekTag}.md`);
  fs.writeFileSync(file, md);
  console.error(`\n✅ Saved to ${file}`);
}

if (flagAppend) {
  const today = new Date();
  const y = today.getUTCFullYear();
  const m = String(today.getUTCMonth() + 1).padStart(2, "0");
  const d = String(today.getUTCDate()).padStart(2, "0");
  const dailyFile = path.join(VAULT, "07-Daily", String(y), m, `${y}-${m}-${d}.md`);
  fs.mkdirSync(path.dirname(dailyFile), { recursive: true });
  const block = `\n\n## 📊 WhistlerBrew Weekly Traffic\n${md.split("\n").slice(2).join("\n")}\n`;
  fs.appendFileSync(dailyFile, block);
  console.error(`\n✅ Appended to ${dailyFile}`);
}
