import type { SupabaseClient } from "@supabase/supabase-js";
import { relationMissing } from "@/lib/programs";

const STALE_THRESHOLD_HOURS = 36;

export type ProgramRefreshRun = {
  id: number;
  created_at: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  parsed_count: number | null;
  deduped_count: number | null;
  upserted_count: number | null;
  website_count: number | null;
  coach_count: number | null;
  quality_updates: number | null;
  trigger: string | null;
  started_by: string | null;
  error_message: string | null;
};

type QueryError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
} | null;

export type ProgramRefreshHealth = "healthy" | "stale" | "failed" | "unknown";

export type ProgramRefreshHealthSummary = {
  status: ProgramRefreshHealth;
  label: string;
  ageHours: number | null;
};

function toDate(value?: string | null) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

export function isMissingProgramSyncTable(error: QueryError) {
  if (!error) {
    return false;
  }
  return (
    relationMissing(error.code) ||
    relationMissing(error.message) ||
    relationMissing(error.details)
  );
}

export async function getLatestProgramRefreshRun(supabase: SupabaseClient) {
  return supabase
    .from("program_refresh_runs")
    .select(
      "id,created_at,started_at,completed_at,status,parsed_count,deduped_count,upserted_count,website_count,coach_count,quality_updates,trigger,started_by,error_message",
    )
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

export function getProgramRefreshHealth(
  run: ProgramRefreshRun | null,
  now = new Date(),
): ProgramRefreshHealthSummary {
  if (!run) {
    return {
      status: "unknown",
      label: "No refresh history yet",
      ageHours: null,
    };
  }

  if (run.status === "failed") {
    return {
      status: "failed",
      label: "Refresh failed",
      ageHours: null,
    };
  }

  const reference = toDate(run.completed_at ?? run.started_at ?? run.created_at);
  if (!reference) {
    return {
      status: "unknown",
      label: "Refresh timestamp unavailable",
      ageHours: null,
    };
  }

  const ageHours = Math.max(
    0,
    (now.getTime() - reference.getTime()) / (60 * 60 * 1000),
  );

  if (ageHours > STALE_THRESHOLD_HOURS) {
    return {
      status: "stale",
      label: "Refresh is stale",
      ageHours,
    };
  }

  return {
    status: "healthy",
    label: "Refresh is healthy",
    ageHours,
  };
}

export function getProgramDataFreshness(
  latestTimestamp: string | null | undefined,
  now = new Date(),
): ProgramRefreshHealthSummary {
  const reference = toDate(latestTimestamp ?? null);
  if (!reference) {
    return {
      status: "unknown",
      label: "No program update timestamp yet",
      ageHours: null,
    };
  }

  const ageHours = Math.max(
    0,
    (now.getTime() - reference.getTime()) / (60 * 60 * 1000),
  );

  if (ageHours > STALE_THRESHOLD_HOURS) {
    return {
      status: "stale",
      label: "Program data is stale",
      ageHours,
    };
  }

  return {
    status: "healthy",
    label: "Program data looks fresh",
    ageHours,
  };
}
