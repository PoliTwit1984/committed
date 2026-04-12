import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProgramInput } from "@/lib/schemas";

export type ProgramRecord = {
  id: number;
  name: string;
  division: string | null;
  conference: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  website: string | null;
  created_at: string;
};

export function normalizeProgramName(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function relationMissing(messageOrCode?: string | null) {
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

function nullIfEmpty(value?: string | null) {
  if (!value || value.trim().length === 0) {
    return null;
  }
  return value.trim();
}

export function toProgramInsertRow(program: ProgramInput) {
  const normalizedLocation = [program.city, program.state]
    .map((part) => normalizeProgramName(part ?? ""))
    .filter(Boolean)
    .join("|");

  return {
    name: program.name.trim(),
    // Use name + location so same-named schools in different states don't collide.
    normalized_name: `${normalizeProgramName(program.name)}|${normalizedLocation}`,
    division: nullIfEmpty(program.division),
    conference: nullIfEmpty(program.conference),
    city: nullIfEmpty(program.city),
    state: nullIfEmpty(program.state),
    country: nullIfEmpty(program.country) ?? "USA",
    roster_size: program.rosterSize ?? null,
    scholarship_limit: program.scholarshipLimit ?? null,
    website: nullIfEmpty(program.website),
    source: nullIfEmpty(program.source) ?? "manual",
    source_url: nullIfEmpty(program.sourceUrl),
  };
}

export async function upsertPrograms(
  supabase: SupabaseClient,
  programs: ProgramInput[],
) {
  const rows = programs.map(toProgramInsertRow);
  return supabase
    .from("programs")
    .upsert(rows, { onConflict: "normalized_name" })
    .select("id,name,division,conference,city,state,country,website,created_at")
    .order("name", { ascending: true });
}

export async function getProgramsCount(supabase: SupabaseClient) {
  return supabase.from("programs").select("id", { count: "exact", head: true });
}

export async function getRecentPrograms(supabase: SupabaseClient, limit: number) {
  return supabase
    .from("programs")
    .select("id,name,division,conference,city,state,country,website,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
}
