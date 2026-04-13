#!/usr/bin/env node
/**
 * Purpose: Import baseball programs into Supabase for NCAA D1/D2/D3, NAIA, JUCO D1, and JUCO D2.
 * Inputs: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.
 * Outputs: Upserted rows in public.programs, refreshed head-coach rows in public.coaches, and console summary.
 * Side effects: Fetches school listings/profile pages, enriches websites/coaches, and writes to Supabase.
 * Failure behavior: Exits non-zero if required env vars are missing, listings cannot be parsed, or DB writes fail.
 */

import { load } from "cheerio";
import { createClient } from "@supabase/supabase-js";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

const SOURCES = [
  {
    url: "https://www.thebaseballcube.com/content/schools/ncaa-1/",
    division: "D1",
    source: "thebaseballcube_ncaa_d1",
  },
  {
    url: "https://www.thebaseballcube.com/content/schools/ncaa-2/",
    division: "D2",
    source: "thebaseballcube_ncaa_d2",
  },
  {
    url: "https://www.thebaseballcube.com/content/schools/ncaa-3/",
    division: "D3",
    source: "thebaseballcube_ncaa_d3",
  },
  {
    url: "https://www.thebaseballcube.com/content/schools/naia/",
    division: "NAIA",
    source: "thebaseballcube_naia",
  },
  {
    url: "https://www.thebaseballcube.com/content/schools/juco/",
    division: "JUCO",
    source: "thebaseballcube_juco",
  },
];

const NCAA_DIRECTORY_ORG_ID = 1;
const NCAA_DIVISIONS = [1, 2, 3];
const NCAA_LABELS = {
  1: "D1",
  2: "D2",
  3: "D3",
};

const BLOCKED_WEBSITE_HOSTS = new Set([
  "thebaseballcube.com",
  "www.thebaseballcube.com",
  "duckduckgo.com",
  "www.duckduckgo.com",
  "x.com",
  "www.x.com",
  "twitter.com",
  "www.twitter.com",
  "facebook.com",
  "www.facebook.com",
  "instagram.com",
  "www.instagram.com",
  "youtube.com",
  "www.youtube.com",
  "wikipedia.org",
  "www.wikipedia.org",
  "maxpreps.com",
  "www.maxpreps.com",
  "perfectgame.org",
  "www.perfectgame.org",
  "prepbaseballreport.com",
  "www.prepbaseballreport.com",
]);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FETCH_TIMEOUT_MS = Number(process.env.PROGRAM_FETCH_TIMEOUT_MS ?? 20000);
const PROFILE_CONCURRENCY = Number(process.env.PROFILE_CONCURRENCY ?? 12);
const PROFILE_RETRIES = Number(process.env.PROFILE_RETRIES ?? 2);
const WEBSITE_DISCOVERY_CONCURRENCY = Number(
  process.env.WEBSITE_DISCOVERY_CONCURRENCY ?? 6,
);
const WEBSITE_DISCOVERY_MAX = Number(process.env.WEBSITE_DISCOVERY_MAX ?? 450);
const ENABLE_WEBSITE_DISCOVERY =
  (process.env.ENABLE_WEBSITE_DISCOVERY ?? "true").toLowerCase() !== "false";
const ENABLE_DATABASE_QUALITY_PASS =
  (process.env.ENABLE_DATABASE_QUALITY_PASS ?? "true").toLowerCase() !== "false";
const STARTED_BY = process.env.GITHUB_ACTIONS ? "github-actions" : "local";
const PROGRAM_REFRESH_TRIGGER = process.env.PROGRAM_REFRESH_TRIGGER ??
  (process.env.GITHUB_ACTIONS ? "scheduled" : "manual");
const QUALITY_ONLY = process.argv.slice(2).includes("--quality-only");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const US_STATE_CODES = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  pennslyvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
  "district of columbia": "DC",
};

const CANADA_PROVINCE_CODES = {
  alberta: "AB",
  "british columbia": "BC",
  manitoba: "MB",
  "new brunswick": "NB",
  "newfoundland and labrador": "NL",
  "newfoundland & labrador": "NL",
  "northwest territories": "NT",
  "nova scotia": "NS",
  nunavut: "NU",
  ontario: "ON",
  "prince edward island": "PE",
  quebec: "QC",
  saskatchewan: "SK",
  yukon: "YT",
};

const NULLISH_TEXT_VALUES = new Set([
  "",
  "-",
  "--",
  "n/a",
  "na",
  "none",
  "unknown",
  "tbd",
]);

const CONFERENCE_FIXUPS = new Map([
  ["pennylvania state athletic conference", "Pennsylvania State Athletic Conference"],
]);

const DIVISION_ALIASES = new Map([
  ["d1", "D1"],
  ["division1", "D1"],
  ["ncaa1", "D1"],
  ["d2", "D2"],
  ["division2", "D2"],
  ["ncaa2", "D2"],
  ["d3", "D3"],
  ["division3", "D3"],
  ["ncaa3", "D3"],
  ["naia", "NAIA"],
  ["juco", "JUCO"],
  ["juco1", "JUCO D1"],
  ["jucod1", "JUCO D1"],
  ["njcaa1", "JUCO D1"],
  ["njcaad1", "JUCO D1"],
  ["juco2", "JUCO D2"],
  ["jucod2", "JUCO D2"],
  ["njcaa2", "JUCO D2"],
  ["njcaad2", "JUCO D2"],
]);

function relationMissing(messageOrCode) {
  if (!messageOrCode) {
    return false;
  }
  const normalized = messageOrCode.toLowerCase();
  return (
    normalized.includes("42p01") ||
    normalized.includes("could not find the table") ||
    /relation\s+["'][^"']+["']\s+does not exist/.test(normalized)
  );
}

function cleanText(value) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeProgramName(name) {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeStateCode(value) {
  const cleaned = cleanText(value);
  if (!cleaned) {
    return "";
  }
  if (/^[A-Za-z]{2}$/.test(cleaned)) {
    return cleaned.toUpperCase();
  }
  const lookup = US_STATE_CODES[cleaned.toLowerCase()];
  return lookup ?? cleaned.toUpperCase();
}

function normalizeRegionCode(value, country) {
  const cleaned = cleanText(value ?? "");
  if (!cleaned) {
    return null;
  }

  if ((country ?? "USA").toLowerCase() === "canada") {
    if (/^[A-Za-z]{2}$/.test(cleaned)) {
      return cleaned.toUpperCase();
    }
    const lookup = CANADA_PROVINCE_CODES[cleaned.toLowerCase()];
    return lookup ?? cleaned;
  }

  return normalizeStateCode(cleaned) || null;
}

function canonicalDivisionKey(value) {
  return cleanText(value ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeDivisionValue(value) {
  const key = canonicalDivisionKey(value);
  if (!key) {
    return null;
  }
  return DIVISION_ALIASES.get(key) ?? cleanText(value);
}

function normalizeConferenceValue(value) {
  const cleaned = cleanText(value ?? "");
  if (!cleaned) {
    return null;
  }
  if (NULLISH_TEXT_VALUES.has(cleaned.toLowerCase())) {
    return null;
  }
  return CONFERENCE_FIXUPS.get(cleaned.toLowerCase()) ?? cleaned;
}

function normalizeCountryValue(value, state) {
  const cleaned = cleanText(value ?? "");
  if (/^canada$/i.test(cleaned)) {
    return "Canada";
  }
  if (/^usa$|^united states$/i.test(cleaned)) {
    return "USA";
  }

  const stateValue = cleanText(state ?? "");
  if (
    /british columbia|ontario|quebec|alberta|saskatchewan|manitoba|new brunswick|nova scotia|prince edward island|newfoundland|canada/i.test(
      stateValue,
    )
  ) {
    return "Canada";
  }

  return "USA";
}

function parseLocation(locationRaw) {
  const location = cleanText(locationRaw);
  const parts = location
    .split(",")
    .map((part) => cleanText(part))
    .filter(Boolean);
  const city = parts[0] ?? null;
  const state = parts.length > 1 ? parts.slice(1).join(", ") : null;
  const country =
    state &&
    /british columbia|ontario|quebec|alberta|saskatchewan|manitoba|new brunswick|nova scotia|prince edward island|newfoundland|canada/i.test(
      state,
    )
      ? "Canada"
      : "USA";
  return { city, state, country };
}

function toAbsoluteUrl(relativePath) {
  if (!relativePath) {
    return null;
  }
  return new URL(relativePath, "https://www.thebaseballcube.com/").toString();
}

function parseInteger(value) {
  const cleaned = cleanText(value).replace(/,/g, "");
  if (!/^\d+$/.test(cleaned)) {
    return null;
  }
  return Number(cleaned);
}

function splitCoachName(fullName) {
  const cleaned = cleanText(fullName);
  if (!cleaned) {
    return { firstName: null, lastName: null };
  }
  const parts = cleaned.split(" ");
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: null };
  }
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

function normalizeExternalUrl(input) {
  const raw = cleanText(input ?? "");
  if (!raw) {
    return null;
  }
  const candidate = raw.startsWith("http://") || raw.startsWith("https://")
    ? raw
    : `https://${raw.replace(/^\/\//, "")}`;
  try {
    const parsed = new URL(candidate);
    return parsed.toString();
  } catch {
    return null;
  }
}

function parseTwitterHandle(input) {
  const raw = cleanText(input ?? "");
  if (!raw) {
    return null;
  }
  const fromUrl = raw.match(/(?:x\.com|twitter\.com)\/([A-Za-z0-9_]+)/i);
  if (fromUrl?.[1]) {
    return fromUrl[1];
  }
  const fromAt = raw.match(/@([A-Za-z0-9_]+)/);
  if (fromAt?.[1]) {
    return fromAt[1];
  }
  if (/^[A-Za-z0-9_]+$/.test(raw)) {
    return raw;
  }
  return null;
}

function buildNormalizedProgramKey(name, city, state) {
  const normalizedLocation = [city, state]
    .map((part) => normalizeProgramName(part ?? ""))
    .filter(Boolean)
    .join("|");
  return `${normalizeProgramName(name)}|${normalizedLocation}`;
}

function normalizeProgramRowForQuality(row) {
  const country = normalizeCountryValue(row.country, row.state);
  const state = normalizeRegionCode(row.state, country);
  const city = cleanText(row.city ?? "") || null;
  const name = cleanText(row.name ?? "");
  const normalizedName = buildNormalizedProgramKey(name, city, state);

  return {
    ...row,
    name,
    city,
    state,
    country,
    division: normalizeDivisionValue(row.division),
    conference: normalizeConferenceValue(row.conference),
    website: normalizeExternalUrl(row.website),
    source: cleanText(row.source ?? "") || null,
    source_url: normalizeExternalUrl(row.source_url),
    normalized_name: normalizedName,
  };
}

function normalizeRowsForQuality(rows) {
  let changed = 0;
  const normalized = rows.map((row) => {
    const next = normalizeProgramRowForQuality(row);
    if (
      next.name !== row.name ||
      next.city !== row.city ||
      next.state !== row.state ||
      next.country !== row.country ||
      next.division !== row.division ||
      next.conference !== row.conference ||
      next.website !== row.website ||
      next.source !== row.source ||
      next.source_url !== row.source_url ||
      next.normalized_name !== row.normalized_name
    ) {
      changed += 1;
    }
    return next;
  });
  return { rows: normalized, changed };
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function withRetries(taskName, callback, retries = 2) {
  let attempts = 0;
  while (attempts <= retries) {
    try {
      return await callback();
    } catch (error) {
      attempts += 1;
      if (attempts > retries) {
        throw error;
      }
      const wait = 250 * attempts;
      console.warn(
        `${taskName} failed (attempt ${attempts}/${retries + 1}). Retrying in ${wait}ms...`,
      );
      await sleep(wait);
    }
  }
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`Source fetch failed (${response.status}) for ${url}`);
    }
    return response.text();
  } finally {
    clearTimeout(timer);
  }
}

function parseSourceRows(html, sourceConfig) {
  const $ = load(html);
  const rows = [];
  const tableRows = $("#grid1 tr.data-row");

  if (tableRows.length === 0) {
    throw new Error(`No data rows found for ${sourceConfig.url}`);
  }

  tableRows.each((_, element) => {
    const cells = $(element).find("td");
    if (cells.length < 6) {
      return;
    }

    const shortName = cleanText($(cells[0]).text());
    const nickname = cleanText($(cells[1]).text());
    const collegeName = cleanText($(cells[4]).text());
    const conference = cleanText($(cells[2]).text());
    const locationRaw = cleanText($(cells[3]).text());
    const year = cleanText($(cells[5]).text());
    const collegeLink = $(cells[0]).find("a").attr("href");
    const { city, state, country } = parseLocation(locationRaw);
    const programName = collegeName || shortName;

    if (!programName) {
      return;
    }

    rows.push({
      name: programName,
      normalized_name: buildNormalizedProgramKey(programName, city, state),
      division: sourceConfig.division,
      conference: conference || null,
      city,
      state,
      country,
      website: null,
      source: sourceConfig.source,
      source_url: toAbsoluteUrl(collegeLink),
      program_status: "active",
      short_name: shortName || null,
      nickname: nickname || null,
      scrape_year: year || null,
      head_coach: null,
      ballpark: null,
      drafted_players: null,
      major_leaguers: null,
      college_division_label: null,
      twitter_handle: null,
    });
  });

  return rows;
}

function parseProfileDetails(html) {
  const $ = load(html);

  let jucoDivision = null;
  $("#grid1 tr.data-row").each((_, row) => {
    if (jucoDivision !== null) {
      return;
    }
    const cells = $(row).find("td");
    const divisionCell = cleanText($(cells[4]).text());
    if (/^\d+$/.test(divisionCell)) {
      jucoDivision = Number(divisionCell);
    }
  });

  const details = {
    shortName: null,
    nickname: null,
    conference: null,
    collegeDivisionLabel: null,
    coachName: null,
    ballpark: null,
    draftedPlayers: null,
    majorLeaguers: null,
    website: null,
    twitterHandle: null,
    jucoDivision,
  };

  $(".pi .pi-row").each((_, row) => {
    const subject = cleanText($(row).find(".pi-subject").first().text()).toLowerCase();
    const valueNode = $(row).find(".pi-value").first();
    const valueText = cleanText(valueNode.text());
    const valueHref = valueNode.find("a").first().attr("href") ?? "";

    if (!subject || !valueText) {
      return;
    }

    if (subject === "short name") {
      details.shortName = valueText;
      return;
    }
    if (subject === "nickname") {
      details.nickname = valueText;
      return;
    }
    if (subject === "conference") {
      details.conference = valueText;
      return;
    }
    if (subject === "college division") {
      details.collegeDivisionLabel = valueText;
      return;
    }
    if (subject === "current head coach") {
      details.coachName = valueText;
      return;
    }
    if (subject === "current ballpark") {
      details.ballpark = valueText;
      return;
    }
    if (subject === "drafted players") {
      details.draftedPlayers = parseInteger(valueText);
      return;
    }
    if (subject === "major leaguers") {
      details.majorLeaguers = parseInteger(valueText);
      return;
    }
    if (subject.includes("website")) {
      details.website = normalizeExternalUrl(valueHref || valueText);
      return;
    }
    if (subject === "twitter") {
      details.twitterHandle = parseTwitterHandle(valueHref || valueText);
    }
  });

  return details;
}

async function mapWithConcurrency(items, limit, mapper) {
  const outputs = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) {
        return;
      }
      outputs[index] = await mapper(items[index], index);
    }
  }

  const workers = Array.from(
    { length: Math.max(1, Math.min(limit, items.length)) },
    () => worker(),
  );
  await Promise.all(workers);
  return outputs;
}

function chunkArray(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

async function enrichRowsFromProfiles(rows) {
  const stats = {
    processed: 0,
    profileErrors: 0,
    jucoD1: 0,
    jucoD2: 0,
    jucoSkipped: 0,
  };

  const enriched = await mapWithConcurrency(
    rows,
    PROFILE_CONCURRENCY,
    async (row) => {
      if (!row.source_url) {
        stats.profileErrors += 1;
        stats.processed += 1;
        return null;
      }

      try {
        const html = await withRetries(
          `Profile fetch: ${row.name}`,
          () => fetchHtml(row.source_url),
          PROFILE_RETRIES,
        );
        const profile = parseProfileDetails(html);

        const enrichedRow = {
          ...row,
          short_name: profile.shortName || row.short_name,
          nickname: profile.nickname || row.nickname,
          conference: profile.conference || row.conference,
          college_division_label: profile.collegeDivisionLabel,
          head_coach: profile.coachName,
          ballpark: profile.ballpark,
          drafted_players: profile.draftedPlayers,
          major_leaguers: profile.majorLeaguers,
          twitter_handle: profile.twitterHandle,
          website: profile.website || row.website,
        };

        if (row.division === "JUCO") {
          if (profile.jucoDivision === 1 || profile.jucoDivision === 2) {
            const label = `JUCO D${profile.jucoDivision}`;
            enrichedRow.division = label;
            enrichedRow.source = `thebaseballcube_njcaa_d${profile.jucoDivision}`;
            if (profile.jucoDivision === 1) {
              stats.jucoD1 += 1;
            } else {
              stats.jucoD2 += 1;
            }
          } else {
            stats.jucoSkipped += 1;
            stats.processed += 1;
            return null;
          }
        }

        stats.processed += 1;
        if (stats.processed % 25 === 0 || stats.processed === rows.length) {
          console.log(`Profile enrichment ${stats.processed}/${rows.length}...`);
        }

        return enrichedRow;
      } catch {
        stats.profileErrors += 1;
        stats.processed += 1;
        if (stats.processed % 25 === 0 || stats.processed === rows.length) {
          console.log(`Profile enrichment ${stats.processed}/${rows.length}...`);
        }
        return null;
      }
    },
  );

  return { rows: enriched.filter(Boolean), stats };
}

function rowCompletenessScore(row) {
  let score = 0;
  if (row.website) score += 5;
  if (row.head_coach) score += 4;
  if (row.conference) score += 2;
  if (row.city) score += 1;
  if (row.state) score += 1;
  if (row.source_url) score += 1;
  return score;
}

function shouldPreferCandidate(existing, candidate) {
  const existingScore = rowCompletenessScore(existing);
  const candidateScore = rowCompletenessScore(candidate);
  if (candidateScore !== existingScore) {
    return candidateScore > existingScore;
  }

  const existingJuco = existing?.source?.startsWith("thebaseballcube_njcaa") ?? false;
  const candidateJuco = candidate?.source?.startsWith("thebaseballcube_njcaa") ?? false;
  if (existingJuco !== candidateJuco) {
    return !candidateJuco;
  }

  return false;
}

function dedupeRows(rows) {
  const byKey = new Map();
  for (const row of rows) {
    if (!byKey.has(row.normalized_name)) {
      byKey.set(row.normalized_name, row);
      continue;
    }

    const existing = byKey.get(row.normalized_name);
    if (existing && shouldPreferCandidate(existing, row)) {
      byKey.set(row.normalized_name, row);
    }
  }
  return [...byKey.values()];
}

async function fetchExistingWebsiteMap(normalizedNames) {
  const map = new Map();
  const chunks = chunkArray([...new Set(normalizedNames)], 60);

  for (const chunk of chunks) {
    const { data, error } = await withRetries(
      "Existing website lookup",
      () =>
        supabase
          .from("programs")
          .select("normalized_name,website")
          .in("normalized_name", chunk)
          .not("website", "is", null),
      2,
    );

    if (error) {
      throw new Error(`Existing website lookup failed: ${error.message}`);
    }

    for (const row of data ?? []) {
      if (row.website) {
        map.set(row.normalized_name, row.website);
      }
    }
  }

  return map;
}

function applyExistingWebsiteFallback(rows, websiteMap) {
  let reused = 0;
  for (const row of rows) {
    if (row.website) {
      continue;
    }
    const known = websiteMap.get(row.normalized_name);
    if (!known) {
      continue;
    }
    row.website = known;
    reused += 1;
  }
  return reused;
}

function buildNCAAKey(name, stateValue) {
  const normalizedName = normalizeProgramName(name);
  const stateCode = normalizeStateCode(stateValue);
  return `${normalizedName}|${stateCode}`;
}

function stripParenthetical(value) {
  return cleanText(value.replace(/\([^)]*\)/g, " "));
}

function rowNameCandidates(row) {
  const values = [row.name, row.short_name, stripParenthetical(row.name)];
  const unique = new Set();
  for (const value of values) {
    const cleaned = cleanText(value ?? "");
    if (!cleaned) {
      continue;
    }
    unique.add(cleaned);
  }
  return [...unique];
}

async function fetchNcaaDirectoryRows() {
  const members = [];
  for (const division of NCAA_DIVISIONS) {
    const url =
      `https://web3.ncaa.org/directory/api/directory/memberList?type=12` +
      `&orgId=${NCAA_DIRECTORY_ORG_ID}&division=${division}&sortOn=0&sortBy=4`;

    const payload = await withRetries(
      `NCAA directory fetch D${division}`,
      async () => {
        const text = await fetchHtml(url);
        return JSON.parse(text);
      },
      2,
    );

    if (!Array.isArray(payload)) {
      continue;
    }

    for (const row of payload) {
      const website =
        normalizeExternalUrl(row?.athleticWebUrl) ??
        normalizeExternalUrl(row?.webSiteUrl);
      if (!website) {
        continue;
      }

      members.push({
        division: NCAA_LABELS[division],
        nameOfficial: cleanText(row?.nameOfficial ?? ""),
        state: cleanText(row?.memberOrgAddress?.state ?? ""),
        website,
      });
    }
  }

  return members;
}

function buildNcaaLookup(members) {
  const byNameState = new Map();
  const byNameUnique = new Map();

  for (const member of members) {
    const key = buildNCAAKey(member.nameOfficial, member.state);
    if (!byNameState.has(key)) {
      byNameState.set(key, member.website);
    }

    const nameKey = normalizeProgramName(member.nameOfficial);
    if (!byNameUnique.has(nameKey)) {
      byNameUnique.set(nameKey, new Set());
    }
    byNameUnique.get(nameKey).add(member.website);
  }

  return { byNameState, byNameUnique };
}

function resolveNcaaWebsiteForRow(row, lookup) {
  const stateCode = normalizeStateCode(row.state ?? "");
  const candidates = rowNameCandidates(row);

  for (const candidate of candidates) {
    const byState = lookup.byNameState.get(
      `${normalizeProgramName(candidate)}|${stateCode}`,
    );
    if (byState) {
      return byState;
    }
  }

  for (const candidate of candidates) {
    const set = lookup.byNameUnique.get(normalizeProgramName(candidate));
    if (!set || set.size !== 1) {
      continue;
    }
    return [...set][0];
  }

  return null;
}

async function applyNcaaWebsiteDiscovery(rows) {
  const ncaaRows = rows.filter(
    (row) =>
      (row.division === "D1" || row.division === "D2" || row.division === "D3") &&
      !row.website,
  );
  if (ncaaRows.length === 0) {
    return 0;
  }

  const ncaaMembers = await fetchNcaaDirectoryRows();
  const lookup = buildNcaaLookup(ncaaMembers);
  let assigned = 0;

  for (const row of ncaaRows) {
    const website = resolveNcaaWebsiteForRow(row, lookup);
    if (!website) {
      continue;
    }
    row.website = website;
    assigned += 1;
  }

  return assigned;
}

function decodeDuckDuckGoHref(href) {
  const cleaned = cleanText(href).replace(/&amp;/g, "&");
  if (!cleaned) {
    return null;
  }

  let urlCandidate = cleaned;
  if (urlCandidate.startsWith("//")) {
    urlCandidate = `https:${urlCandidate}`;
  }

  try {
    const parsed = new URL(urlCandidate);
    if (parsed.hostname.endsWith("duckduckgo.com")) {
      const uddg = parsed.searchParams.get("uddg");
      if (!uddg) {
        return null;
      }
      return decodeURIComponent(uddg);
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function extractDuckDuckGoLinks(html) {
  const links = [];
  const regex = /class="result__a"[^>]*href="([^"]+)"/g;
  let match = regex.exec(html);
  while (match) {
    const decoded = decodeDuckDuckGoHref(match[1]);
    if (decoded) {
      links.push(decoded);
    }
    match = regex.exec(html);
  }
  return links;
}

function scoreCandidateWebsite(urlString) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    return -1;
  }

  if (BLOCKED_WEBSITE_HOSTS.has(parsed.hostname.toLowerCase())) {
    return -1;
  }

  let score = 1;
  const path = parsed.pathname.toLowerCase();
  const host = parsed.hostname.toLowerCase();
  if (path.includes("/sports/baseball")) {
    score += 8;
  } else if (path.includes("/baseball")) {
    score += 6;
  }
  if (path.includes("/athletics")) {
    score += 3;
  }
  if (host.startsWith("athletics.") || host.includes("sports")) {
    score += 2;
  }
  return score;
}

async function discoverWebsiteWithDuckDuckGo(row) {
  const queries = [
    `${row.name} baseball official athletics`,
    `${row.name} baseball`,
  ];

  for (const query of queries) {
    const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    let html;
    try {
      html = await fetchHtml(url);
    } catch {
      continue;
    }

    const links = extractDuckDuckGoLinks(html);
    let best = null;
    let bestScore = -1;
    for (const link of links) {
      const score = scoreCandidateWebsite(link);
      if (score > bestScore) {
        best = link;
        bestScore = score;
      }
    }

    if (best && bestScore > 1) {
      return normalizeExternalUrl(best);
    }
  }

  return null;
}

async function applyFallbackWebsiteDiscovery(rows) {
  if (!ENABLE_WEBSITE_DISCOVERY) {
    return { discovered: 0, attempted: 0, errors: 0 };
  }

  const targets = rows
    .filter((row) => !row.website)
    .slice(0, Math.max(0, WEBSITE_DISCOVERY_MAX));

  const stats = { discovered: 0, attempted: 0, errors: 0 };
  if (targets.length === 0) {
    return stats;
  }

  await mapWithConcurrency(
    targets,
    WEBSITE_DISCOVERY_CONCURRENCY,
    async (row) => {
      stats.attempted += 1;
      try {
        const website = await discoverWebsiteWithDuckDuckGo(row);
        if (website) {
          row.website = website;
          stats.discovered += 1;
        }
      } catch {
        stats.errors += 1;
      }

      if (stats.attempted % 25 === 0 || stats.attempted === targets.length) {
        console.log(
          `Fallback website discovery ${stats.attempted}/${targets.length} (found: ${stats.discovered})...`,
        );
      }
    },
  );

  return stats;
}

async function upsertInBatches(rows, batchSize = 300) {
  const toProgramRow = (row) => ({
    name: row.name,
    normalized_name: row.normalized_name,
    division: row.division,
    conference: row.conference,
    city: row.city,
    state: row.state,
    country: row.country,
    website: row.website,
    source: row.source,
    source_url: row.source_url,
    program_status: row.program_status,
  });

  let processed = 0;
  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize).map(toProgramRow);
    const { error } = await supabase
      .from("programs")
      .upsert(batch, { onConflict: "normalized_name" });

    if (error) {
      throw new Error(`Upsert failed: ${error.message}`);
    }

    processed += batch.length;
    console.log(`Upserted ${processed}/${rows.length} programs...`);
  }
}

async function fetchProgramIdMap(normalizedNames) {
  const idMap = new Map();
  const chunks = chunkArray([...new Set(normalizedNames)], 250);

  for (const chunk of chunks) {
    const { data, error } = await supabase
      .from("programs")
      .select("id,normalized_name")
      .in("normalized_name", chunk);

    if (error) {
      throw new Error(`Program ID lookup failed: ${error.message}`);
    }

    for (const row of data ?? []) {
      idMap.set(row.normalized_name, row.id);
    }
  }

  return idMap;
}

async function upsertHeadCoaches(rows) {
  const rowsWithCoach = rows.filter(
    (row) => typeof row.head_coach === "string" && row.head_coach.trim().length > 0,
  );
  if (rowsWithCoach.length === 0) {
    return 0;
  }

  const idMap = await fetchProgramIdMap(
    rowsWithCoach.map((row) => row.normalized_name),
  );

  const coachRows = [];
  for (const row of rowsWithCoach) {
    const programId = idMap.get(row.normalized_name);
    if (!programId) {
      continue;
    }

    const coach = cleanText(row.head_coach);
    if (!coach) {
      continue;
    }
    const split = splitCoachName(coach);

    coachRows.push({
      program_id: programId,
      first_name: split.firstName,
      last_name: split.lastName,
      full_name: coach,
      role: "Head Coach",
      recruiting_coordinator: false,
      is_active: true,
      source: row.source,
      source_url: row.source_url,
    });
  }

  if (coachRows.length === 0) {
    return 0;
  }

  const sourceList = [...new Set(coachRows.map((row) => row.source).filter(Boolean))];
  if (sourceList.length > 0) {
    const { error: deleteError } = await supabase
      .from("coaches")
      .delete()
      .eq("role", "Head Coach")
      .in("source", sourceList);

    if (deleteError) {
      throw new Error(`Coach cleanup failed: ${deleteError.message}`);
    }
  }

  const chunks = chunkArray(coachRows, 250);
  for (const chunk of chunks) {
    const { error } = await supabase.from("coaches").insert(chunk);
    if (error) {
      throw new Error(`Coach upsert failed: ${error.message}`);
    }
  }

  return coachRows.length;
}

async function startRefreshRun() {
  const runContext = {
    mode: QUALITY_ONLY ? "quality-only" : "full",
    workflow: process.env.GITHUB_WORKFLOW ?? null,
    run_id: process.env.GITHUB_RUN_ID ?? null,
    run_attempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
    actor: process.env.GITHUB_ACTOR ?? null,
    repository: process.env.GITHUB_REPOSITORY ?? null,
    ref: process.env.GITHUB_REF ?? null,
  };

  const { data, error } = await supabase
    .from("program_refresh_runs")
    .insert({
      status: "running",
      started_at: new Date().toISOString(),
      trigger: PROGRAM_REFRESH_TRIGGER,
      started_by: STARTED_BY,
      run_context: runContext,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    if (relationMissing(error.code) || relationMissing(error.message)) {
      return null;
    }
    throw new Error(`Unable to create refresh run: ${error.message}`);
  }

  return data?.id ?? null;
}

async function completeRefreshRun(runId, payload) {
  if (!runId) {
    return;
  }

  const { error } = await supabase
    .from("program_refresh_runs")
    .update({
      ...payload,
      completed_at: new Date().toISOString(),
    })
    .eq("id", runId);

  if (error) {
    console.warn(`Unable to update refresh run ${runId}: ${error.message}`);
  }
}

async function getProgramTableStats() {
  const [totalResult, websiteResult] = await Promise.all([
    supabase.from("programs").select("id", { count: "exact", head: true }),
    supabase
      .from("programs")
      .select("id", { count: "exact", head: true })
      .not("website", "is", null),
  ]);

  if (totalResult.error) {
    throw new Error(`Program count query failed: ${totalResult.error.message}`);
  }
  if (websiteResult.error) {
    throw new Error(`Program website count query failed: ${websiteResult.error.message}`);
  }

  return {
    totalPrograms: totalResult.count ?? 0,
    websiteCount: websiteResult.count ?? 0,
  };
}

async function runDatabaseQualityPass() {
  if (!ENABLE_DATABASE_QUALITY_PASS) {
    return 0;
  }

  let updatedRows = 0;
  let offset = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("programs")
      .select("id,name,city,state,country,division,conference,website,source,source_url")
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new Error(`Quality pass read failed: ${error.message}`);
    }

    const rows = data ?? [];
    if (rows.length === 0) {
      break;
    }

    const updates = [];
    for (const row of rows) {
      const normalized = normalizeProgramRowForQuality(row);
      if (
        normalized.name !== row.name ||
        normalized.city !== row.city ||
        normalized.state !== row.state ||
        normalized.country !== row.country ||
        normalized.division !== row.division ||
        normalized.conference !== row.conference ||
        normalized.website !== row.website ||
        normalized.source !== row.source ||
        normalized.source_url !== row.source_url
      ) {
        updates.push({
          id: row.id,
          name: normalized.name,
          city: normalized.city,
          state: normalized.state,
          country: normalized.country,
          division: normalized.division,
          conference: normalized.conference,
          website: normalized.website,
          source: normalized.source,
          source_url: normalized.source_url,
          updated_at: new Date().toISOString(),
        });
      }
    }

    if (updates.length > 0) {
      const chunks = chunkArray(updates, 200);
      for (const chunk of chunks) {
        const { error: updateError } = await supabase
          .from("programs")
          .upsert(chunk, { onConflict: "id" });
        if (updateError) {
          throw new Error(`Quality pass update failed: ${updateError.message}`);
        }
      }
      updatedRows += updates.length;
    }

    offset += rows.length;
  }

  return updatedRows;
}

function summarizeDivisionCounts(rows) {
  const counts = {};
  for (const row of rows) {
    const key = row.division || "UNKNOWN";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([division, count]) => ({ division, count }));
}

async function run() {
  const refreshRunId = await startRefreshRun();

  try {
    if (QUALITY_ONLY) {
      console.log("Running database quality pass only...");
      const qualityUpdates = await runDatabaseQualityPass();
      const tableStats = await getProgramTableStats();

      await completeRefreshRun(refreshRunId, {
        status: "success",
        parsed_count: 0,
        deduped_count: tableStats.totalPrograms,
        upserted_count: tableStats.totalPrograms,
        website_count: tableStats.websiteCount,
        coach_count: null,
        quality_updates: qualityUpdates,
        error_message: null,
      });

      console.log(`Quality pass updates: ${qualityUpdates}`);
      console.log(`Programs table count: ${tableStats.totalPrograms}`);
      console.log(`Programs with websites: ${tableStats.websiteCount}`);
      return;
    }

    console.log("Loading baseball program listings...");

    const parsedRows = [];
    const sourceStats = [];

    for (const source of SOURCES) {
      console.log(`Fetching ${source.url}`);
      const html = await withRetries(
        `Listing fetch: ${source.url}`,
        () => fetchHtml(source.url),
        2,
      );
      const rows = parseSourceRows(html, source);
      sourceStats.push({
        source: source.source,
        division: source.division,
        rows: rows.length,
      });
      parsedRows.push(...rows);
      console.log(`Parsed ${rows.length} rows for ${source.division}.`);
    }

    console.log(`Enriching ${parsedRows.length} programs from profile pages...`);
    const profileResult = await enrichRowsFromProfiles(parsedRows);
    const enrichedRows = profileResult.rows;
    const profileStats = profileResult.stats;

    sourceStats.push({
      source: "thebaseballcube_njcaa_d1",
      division: "JUCO D1",
      rows: profileStats.jucoD1,
    });
    sourceStats.push({
      source: "thebaseballcube_njcaa_d2",
      division: "JUCO D2",
      rows: profileStats.jucoD2,
    });

    console.log(
      `Profile enrichment complete: kept=${enrichedRows.length}, JUCO D1=${profileStats.jucoD1}, JUCO D2=${profileStats.jucoD2}, JUCO skipped=${profileStats.jucoSkipped}, profile errors=${profileStats.profileErrors}.`,
    );

    const normalizedResult = normalizeRowsForQuality(enrichedRows);
    const qualityNormalizedRows = normalizedResult.rows;
    console.log(`Pre-upsert normalization changes: ${normalizedResult.changed}.`);

    const deduped = dedupeRows(qualityNormalizedRows);
    console.log(`Deduped programs: ${deduped.length}.`);

    let reusedWebsites = 0;
    try {
      const existingWebsiteMap = await fetchExistingWebsiteMap(
        deduped.map((row) => row.normalized_name),
      );
      reusedWebsites = applyExistingWebsiteFallback(deduped, existingWebsiteMap);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Skipping existing website reuse due to lookup error: ${message}`);
    }
    console.log(`Reused existing known websites: ${reusedWebsites}.`);

    console.log("Applying NCAA directory website enrichment...");
    const ncaaWebsiteCount = await applyNcaaWebsiteDiscovery(deduped);
    console.log(`NCAA websites assigned: ${ncaaWebsiteCount}.`);

    console.log("Applying fallback website discovery for remaining schools...");
    const fallbackWebsites = await applyFallbackWebsiteDiscovery(deduped);
    console.log(
      `Fallback website discovery assigned: ${fallbackWebsites.discovered}/${fallbackWebsites.attempted}.`,
    );

    await upsertInBatches(deduped);
    const coachCount = await upsertHeadCoaches(deduped);
    const qualityUpdates = await runDatabaseQualityPass();
    const tableStats = await getProgramTableStats();

    console.log("Import complete.");
    console.table(sourceStats);
    console.table(summarizeDivisionCounts(deduped));
    console.log(`Programs with websites: ${tableStats.websiteCount}/${deduped.length}`);
    console.log(`Head coaches upserted: ${coachCount}`);
    console.log(`Programs table count: ${tableStats.totalPrograms}`);
    console.log(`Database quality pass updates: ${qualityUpdates}`);

    await completeRefreshRun(refreshRunId, {
      status: "success",
      parsed_count: parsedRows.length,
      deduped_count: deduped.length,
      upserted_count: tableStats.totalPrograms,
      website_count: tableStats.websiteCount,
      coach_count: coachCount,
      quality_updates: qualityUpdates,
      error_message: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await completeRefreshRun(refreshRunId, {
      status: "failed",
      error_message: message,
    });
    throw error;
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
