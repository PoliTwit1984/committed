import { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { DemoRequestInput } from "@/lib/schemas";

type TableStatus = "ok" | "missing_table" | "query_error";

type TableResult<T> = {
  rows: T[];
  status: TableStatus;
};

export type Phase2RecruitingContext = {
  mode: "data" | "fallback";
  tableStatus: Record<string, TableStatus>;
  programs: Array<{
    name: string;
    division: string | null;
    conference: string | null;
    state: string | null;
  }>;
  coaches: Array<{
    full_name: string;
    role: string | null;
    program_name: string | null;
    email: string | null;
  }>;
  programNeeds: Array<{
    program_name: string | null;
    recruiting_cycle_year: number;
    position: string;
    need_score: number | null;
  }>;
  commitments: Array<{
    player_name: string;
    committed_program_name: string | null;
    committed_level: string | null;
    grad_year: number | null;
    position: string | null;
  }>;
  showcases: Array<{
    event_name: string;
    organizer: string | null;
    start_date: string | null;
    state: string | null;
    cost_usd: number | null;
  }>;
  showcaseOutcomes: Array<{
    showcase_name: string | null;
    commitments_generated: number;
    offers_reported: number;
    roi_score: number | null;
  }>;
  benchmarkPlayers: Array<{
    full_name: string;
    grad_year: number | null;
    primary_position: string | null;
    school_name: string | null;
    gpa: number | null;
  }>;
  requestedTargets: string[];
};

function tableMissing(error: PostgrestError | null) {
  if (!error) {
    return false;
  }
  return (
    error.code === "42P01" ||
    error.message.toLowerCase().includes("could not find the table")
  );
}

async function safeSelect<T>(
  _supabase: SupabaseClient,
  table: string,
  queryFactory: () => PromiseLike<{ data: unknown; error: PostgrestError | null }>,
): Promise<TableResult<T>> {
  try {
    const { data, error } = await queryFactory();
    if (error) {
      if (tableMissing(error)) {
        return { rows: [], status: "missing_table" };
      }
      console.error(`Phase2 query failed (${table}):`, error.message);
      return { rows: [], status: "query_error" };
    }
    return { rows: ((data as T[] | null) ?? []) as T[], status: "ok" };
  } catch (error) {
    console.error(`Phase2 query threw (${table}):`, error);
    return { rows: [], status: "query_error" };
  }
}

export async function fetchPhase2RecruitingContext(
  supabase: SupabaseClient,
  input: DemoRequestInput,
): Promise<Phase2RecruitingContext> {
  const todayIso = new Date().toISOString().slice(0, 10);
  const requestedTargets = input.targetSchools
    .split(",")
    .map((target) => target.trim())
    .filter(Boolean);

  const [
    programs,
    coaches,
    programNeeds,
    commitments,
    showcases,
    showcaseOutcomes,
    benchmarkPlayers,
  ] = await Promise.all([
    safeSelect<Phase2RecruitingContext["programs"][number]>(supabase, "programs", () =>
      supabase
        .from("programs")
        .select("name,division,conference,state")
        .limit(10),
    ),
    safeSelect<{
      full_name: string;
      role: string | null;
      email: string | null;
      programs: { name: string | null } | null;
    }>(supabase, "coaches", () =>
      supabase
        .from("coaches")
        .select("full_name,role,email,programs(name)")
        .limit(12),
    ),
    safeSelect<{
      recruiting_cycle_year: number;
      position: string;
      need_score: number | null;
      programs: { name: string | null } | null;
    }>(supabase, "program_needs", () =>
      supabase
        .from("program_needs")
        .select("recruiting_cycle_year,position,need_score,programs(name)")
        .order("need_score", { ascending: false })
        .limit(15),
    ),
    safeSelect<Phase2RecruitingContext["commitments"][number]>(supabase, "commitments", () =>
      supabase
        .from("commitments")
        .select(
          "player_name,committed_program_name,committed_level,grad_year,position",
        )
        .order("commitment_date", { ascending: false })
        .limit(20),
    ),
    safeSelect<Phase2RecruitingContext["showcases"][number]>(supabase, "showcases", () =>
      supabase
        .from("showcases")
        .select("event_name,organizer,start_date,state,cost_usd")
        .gte("start_date", todayIso)
        .order("start_date", { ascending: true })
        .limit(10),
    ),
    safeSelect<{
      commitments_generated: number;
      offers_reported: number;
      roi_score: number | null;
      showcases: { event_name: string | null } | null;
    }>(supabase, "showcase_outcomes", () =>
      supabase
        .from("showcase_outcomes")
        .select("commitments_generated,offers_reported,roi_score,showcases(event_name)")
        .order("created_at", { ascending: false })
        .limit(10),
    ),
    safeSelect<Phase2RecruitingContext["benchmarkPlayers"][number]>(
      supabase,
      "hs_players",
      () =>
        supabase
          .from("hs_players")
          .select("full_name,grad_year,primary_position,school_name,gpa")
          .limit(20),
    ),
  ]);

  const context = {
    programs: programs.rows,
    coaches: coaches.rows.map((coach) => ({
      full_name: coach.full_name,
      role: coach.role,
      email: coach.email,
      program_name: coach.programs?.name ?? null,
    })),
    programNeeds: programNeeds.rows.map((need) => ({
      program_name: need.programs?.name ?? null,
      recruiting_cycle_year: need.recruiting_cycle_year,
      position: need.position,
      need_score: need.need_score,
    })),
    commitments: commitments.rows,
    showcases: showcases.rows,
    showcaseOutcomes: showcaseOutcomes.rows.map((outcome) => ({
      showcase_name: outcome.showcases?.event_name ?? null,
      commitments_generated: outcome.commitments_generated,
      offers_reported: outcome.offers_reported,
      roi_score: outcome.roi_score,
    })),
    benchmarkPlayers: benchmarkPlayers.rows,
  };

  const hasData = Object.values(context).some((value) =>
    Array.isArray(value) ? value.length > 0 : false,
  );

  return {
    mode: hasData ? "data" : "fallback",
    tableStatus: {
      programs: programs.status,
      coaches: coaches.status,
      program_needs: programNeeds.status,
      commitments: commitments.status,
      showcases: showcases.status,
      showcase_outcomes: showcaseOutcomes.status,
      hs_players: benchmarkPlayers.status,
    },
    requestedTargets,
    ...context,
  };
}
