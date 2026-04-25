#!/usr/bin/env node
// Cloudflare Web Analytics + HTTP Traffic report for whistlerbrew.com
//
// Usage:
//   node scripts/cf-report.mjs            # last 7 days (default)
//   node scripts/cf-report.mjs 1          # last 1 day
//   node scripts/cf-report.mjs 30         # last 30 days
//
// Token: secrets/api-keys.json → .cloudflare.analytics_token
// Required scopes: Account Analytics:Read + Zone Analytics:Read

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
const GRAPHQL = "https://api.cloudflare.com/client/v4/graphql";

const days = Number(process.argv[2] || 7);
const since = new Date(Date.now() - days * 86400000).toISOString();
const until = new Date().toISOString();
const sinceDate = since.slice(0, 10);
const untilDate = until.slice(0, 10);

async function gql(query) {
  const res = await fetch(GRAPHQL, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const json = await res.json();
  if (json.errors) {
    console.error("GraphQL errors:", JSON.stringify(json.errors, null, 2));
    process.exit(1);
  }
  return json.data;
}

const fmt = (n) => Number(n).toLocaleString();

const rumQuery = `{
  viewer {
    accounts(filter: { accountTag: "${ACCOUNT_ID}" }) {
      totals: rumPageloadEventsAdaptiveGroups(limit: 1, filter: { datetime_geq: "${since}", datetime_leq: "${until}", requestHost: "${HOST}" }) { count sum { visits } }
      byPath: rumPageloadEventsAdaptiveGroups(limit: 20, filter: { datetime_geq: "${since}", datetime_leq: "${until}", requestHost: "${HOST}" }, orderBy: [count_DESC]) { count sum { visits } dimensions { requestPath } }
      byCountry: rumPageloadEventsAdaptiveGroups(limit: 10, filter: { datetime_geq: "${since}", datetime_leq: "${until}", requestHost: "${HOST}" }, orderBy: [count_DESC]) { count dimensions { countryName } }
      byReferer: rumPageloadEventsAdaptiveGroups(limit: 10, filter: { datetime_geq: "${since}", datetime_leq: "${until}", requestHost: "${HOST}", refererHost_neq: "" }, orderBy: [count_DESC]) { count dimensions { refererHost } }
      byBrowser: rumPageloadEventsAdaptiveGroups(limit: 5, filter: { datetime_geq: "${since}", datetime_leq: "${until}", requestHost: "${HOST}" }, orderBy: [count_DESC]) { count dimensions { userAgentBrowser } }
      byDevice: rumPageloadEventsAdaptiveGroups(limit: 5, filter: { datetime_geq: "${since}", datetime_leq: "${until}", requestHost: "${HOST}" }, orderBy: [count_DESC]) { count dimensions { deviceType } }
    }
  }
}`;

const httpQuery = `{
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

console.log(`\n📊 ${HOST} — last ${days} day${days > 1 ? "s" : ""} (${sinceDate} → ${untilDate})\n`);

const rum = await gql(rumQuery);
const a = rum.viewer.accounts[0];

if (a.totals[0]?.count) {
  const t = a.totals[0];
  console.log(`👁  Web Analytics — real human page views`);
  console.log(`   Page views: ${fmt(t.count)}    Visits: ${fmt(t.sum.visits)}\n`);

  console.log(`📄 Top pages`);
  a.byPath.forEach((r) => console.log(`   ${fmt(r.count).padStart(6)}  ${r.dimensions.requestPath}`));
  console.log("");

  console.log(`🌍 Countries`);
  a.byCountry.forEach((r) => console.log(`   ${fmt(r.count).padStart(6)}  ${r.dimensions.countryName}`));
  console.log("");

  if (a.byReferer.length) {
    console.log(`🔗 Referrers`);
    a.byReferer.forEach((r) => console.log(`   ${fmt(r.count).padStart(6)}  ${r.dimensions.refererHost}`));
    console.log("");
  }

  console.log(`🖥  Browsers`);
  a.byBrowser.forEach((r) => console.log(`   ${fmt(r.count).padStart(6)}  ${r.dimensions.userAgentBrowser}`));
  console.log("");

  console.log(`📱 Devices`);
  a.byDevice.forEach((r) => console.log(`   ${fmt(r.count).padStart(6)}  ${r.dimensions.deviceType}`));
  console.log("");
} else {
  console.log("Web Analytics: no human page views in window.\n");
}

const http = await gql(httpQuery);
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
console.log(`🌐 Edge HTTP traffic (everything, incl. bots/assets)`);
console.log(`   Total requests: ${fmt(totals.requests)}    Cached: ${fmt(totals.cached)} (${((totals.cached / totals.requests) * 100).toFixed(1)}%)`);
console.log(`   Bandwidth: ${(totals.bytes / 1e9).toFixed(2)} GB    Threats blocked: ${fmt(totals.threats)}`);
console.log("");
console.log(`Daily breakdown:`);
days_data.forEach((d) =>
  console.log(`   ${d.dimensions.date}  reqs=${fmt(d.sum.requests).padStart(5)}  pv=${String(d.sum.pageViews).padStart(3)}  uniq=${String(d.uniq.uniques).padStart(3)}  bw=${(d.sum.bytes / 1e9).toFixed(2)}GB`)
);
console.log("");
