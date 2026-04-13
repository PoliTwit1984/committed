import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Search,
} from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { hasSupabaseServerEnv } from "@/lib/env";
import { relationMissing } from "@/lib/programs";
import {
  getProgramDataFreshness,
  getLatestProgramRefreshRun,
  getProgramRefreshHealth,
  isMissingProgramSyncTable,
  type ProgramRefreshRun,
} from "@/lib/program-sync";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PAGE_SIZE = 50;

type ProgramRow = {
  id: number;
  name: string;
  division: string | null;
  conference: string | null;
  city: string | null;
  state: string | null;
  website: string | null;
};

type CoachRow = {
  program_id: number | null;
  full_name: string | null;
};

type FilterRow = {
  division: string | null;
  state: string | null;
  conference: string | null;
};

type ProgramTimestampRow = {
  updated_at: string | null;
  created_at: string;
};

type SearchParamValue = string | string[] | undefined;
type SearchParams = Record<string, SearchParamValue>;

function firstValue(value: SearchParamValue) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

function cleaned(value: SearchParamValue) {
  return firstValue(value).trim();
}

function toPage(value: SearchParamValue) {
  const parsed = Number.parseInt(firstValue(value), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return parsed;
}

function uniqueSorted(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => !!value && value.trim().length > 0))]
    .sort((a, b) => a.localeCompare(b));
}

function buildProgramsHref(filters: {
  q: string;
  division: string;
  state: string;
  conference: string;
  page: number;
}) {
  const params = new URLSearchParams();
  if (filters.q) {
    params.set("q", filters.q);
  }
  if (filters.division) {
    params.set("division", filters.division);
  }
  if (filters.state) {
    params.set("state", filters.state);
  }
  if (filters.conference) {
    params.set("conference", filters.conference);
  }
  if (filters.page > 1) {
    params.set("page", String(filters.page));
  }

  const query = params.toString();
  return query.length > 0 ? `/programs?${query}` : "/programs";
}

function isTableMissingError(error: { code?: string | null; message?: string | null } | null) {
  if (!error) {
    return false;
  }
  return relationMissing(error.code) || relationMissing(error.message);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
}

export default async function ProgramsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  if (!hasSupabaseServerEnv()) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="font-heading text-4xl text-primary">Program Explorer</h1>
        <p className="mt-4 text-muted-foreground">
          Supabase environment variables are missing, so school data cannot be loaded.
        </p>
      </main>
    );
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const q = cleaned(resolvedSearchParams.q);
  const division = cleaned(resolvedSearchParams.division);
  const state = cleaned(resolvedSearchParams.state);
  const conference = cleaned(resolvedSearchParams.conference);
  const page = toPage(resolvedSearchParams.page);

  const filters = { q, division, state, conference };
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = createSupabaseAdminClient();

  let programsCountQuery = supabase
    .from("programs")
    .select("id", { count: "exact", head: true });
  let programsRowsQuery = supabase
    .from("programs")
    .select("id,name,division,conference,city,state,website")
    .order("name", { ascending: true })
    .range(from, to);

  if (filters.q) {
    programsCountQuery = programsCountQuery.ilike("name", `%${filters.q}%`);
    programsRowsQuery = programsRowsQuery.ilike("name", `%${filters.q}%`);
  }
  if (filters.division) {
    programsCountQuery = programsCountQuery.eq("division", filters.division);
    programsRowsQuery = programsRowsQuery.eq("division", filters.division);
  }
  if (filters.state) {
    programsCountQuery = programsCountQuery.eq("state", filters.state);
    programsRowsQuery = programsRowsQuery.eq("state", filters.state);
  }
  if (filters.conference) {
    programsCountQuery = programsCountQuery.eq("conference", filters.conference);
    programsRowsQuery = programsRowsQuery.eq("conference", filters.conference);
  }
  const filterRowsQuery = supabase
    .from("programs")
    .select("division,state,conference")
    .limit(5000);
  const syncRunQuery = getLatestProgramRefreshRun(supabase);
  const latestProgramTimestampQuery = supabase
    .from("programs")
    .select("updated_at,created_at")
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const websiteCountQuery = supabase
    .from("programs")
    .select("id", { count: "exact", head: true })
    .not("website", "is", null);
  const coachCountQuery = supabase
    .from("coaches")
    .select("id", { count: "exact", head: true })
    .eq("role", "Head Coach")
    .eq("is_active", true);

  const [
    countResult,
    rowsResult,
    filterRowsResult,
    syncRunResult,
    latestProgramTimestampResult,
    websiteCountResult,
    coachCountResult,
  ] = await Promise.all([
    programsCountQuery,
    programsRowsQuery,
    filterRowsQuery,
    syncRunQuery,
    latestProgramTimestampQuery,
    websiteCountQuery,
    coachCountQuery,
  ]);

  if (
    isTableMissingError(countResult.error) ||
    isTableMissingError(rowsResult.error) ||
    isTableMissingError(filterRowsResult.error)
  ) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="font-heading text-4xl text-primary">Program Explorer</h1>
        <p className="mt-4 text-muted-foreground">
          Programs table is not available yet. Apply `supabase/schema.sql` first.
        </p>
      </main>
    );
  }

  if (countResult.error || rowsResult.error || filterRowsResult.error) {
    const errorMessage =
      countResult.error?.message ??
      rowsResult.error?.message ??
      filterRowsResult.error?.message ??
      "Unknown error.";

    return (
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="font-heading text-4xl text-primary">Program Explorer</h1>
        <p className="mt-4 text-destructive">Could not load school data: {errorMessage}</p>
      </main>
    );
  }

  const programs = (rowsResult.data ?? []) as ProgramRow[];
  const totalPrograms = countResult.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalPrograms / PAGE_SIZE));

  const coachByProgramId = new Map<number, string>();
  if (programs.length > 0) {
    const programIds = programs.map((program) => program.id);
    const coachesResult = await supabase
      .from("coaches")
      .select("program_id,full_name")
      .in("program_id", programIds)
      .eq("role", "Head Coach")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (!coachesResult.error) {
      for (const coach of (coachesResult.data ?? []) as CoachRow[]) {
        if (!coach.program_id || !coach.full_name || coachByProgramId.has(coach.program_id)) {
          continue;
        }
        coachByProgramId.set(coach.program_id, coach.full_name);
      }
    }
  }

  const filterRows = (filterRowsResult.data ?? []) as FilterRow[];
  const divisionOptions = uniqueSorted(filterRows.map((row) => row.division));
  const stateOptions = uniqueSorted(filterRows.map((row) => row.state));
  const conferenceOptions = uniqueSorted(filterRows.map((row) => row.conference));

  let syncErrorMessage: string | null = null;
  let latestSyncRun: ProgramRefreshRun | null = null;
  let latestProgramTimestamp: string | null = null;
  let fallbackCountError: string | null = null;

  if (syncRunResult.error) {
    if (!isMissingProgramSyncTable(syncRunResult.error)) {
      syncErrorMessage = syncRunResult.error.message ?? "Unknown sync status error.";
    }
  } else {
    latestSyncRun = (syncRunResult.data as ProgramRefreshRun | null) ?? null;
  }

  if (latestProgramTimestampResult.error) {
    if (!isTableMissingError(latestProgramTimestampResult.error)) {
      fallbackCountError =
        latestProgramTimestampResult.error.message ?? "Unable to load latest program timestamp.";
    }
  } else {
    const timestampRow = (latestProgramTimestampResult.data as ProgramTimestampRow | null) ?? null;
    latestProgramTimestamp = timestampRow?.updated_at ?? timestampRow?.created_at ?? null;
  }

  if (websiteCountResult.error && !isTableMissingError(websiteCountResult.error)) {
    fallbackCountError = websiteCountResult.error.message ?? fallbackCountError;
  }
  if (coachCountResult.error && !isTableMissingError(coachCountResult.error)) {
    fallbackCountError = coachCountResult.error.message ?? fallbackCountError;
  }

  const syncHealth = latestSyncRun
    ? getProgramRefreshHealth(latestSyncRun)
    : getProgramDataFreshness(latestProgramTimestamp);
  const syncVariant =
    syncHealth.status === "failed"
      ? "destructive"
      : syncHealth.status === "stale"
        ? "secondary"
        : "default";
  const lastSyncAt = latestSyncRun
    ? latestSyncRun.completed_at ?? latestSyncRun.started_at ?? latestSyncRun.created_at ?? null
    : latestProgramTimestamp;
  const visibleProgramsCount = latestSyncRun?.upserted_count ?? countResult.count ?? 0;
  const visibleWebsitesCount = latestSyncRun?.website_count ?? websiteCountResult.count ?? "—";
  const visibleCoachesCount = latestSyncRun?.coach_count ?? coachCountResult.count ?? "—";

  const hasFilters = q || division || state || conference;
  const prevPageHref = buildProgramsHref({
    ...filters,
    page: Math.max(1, page - 1),
  });
  const nextPageHref = buildProgramsHref({
    ...filters,
    page: Math.min(totalPages, page + 1),
  });

  return (
    <main className="bg-background text-foreground">
      <section className="border-b border-border bg-white">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-muted-foreground transition hover:text-primary"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to home
          </Link>

          <h1 className="mt-4 font-heading text-4xl text-primary">Program Explorer</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Browse college baseball programs by division, state, conference, coach, and website.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-8">
        <Card className="border-primary/10 bg-primary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Data Sync
              </p>
              <p className="mt-1 text-sm text-foreground">
                Last refresh: <span className="font-semibold">{formatDateTime(lastSyncAt)}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Trigger: {latestSyncRun?.trigger ?? "programs-table-fallback"} • Started by:{" "}
                {latestSyncRun?.started_by ?? "system"}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={syncVariant}>
                {syncHealth.status === "healthy" ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5" />
                )}
                {syncHealth.label}
              </Badge>
              <Badge variant="outline">
                Programs: {visibleProgramsCount}
              </Badge>
              <Badge variant="outline">Websites: {visibleWebsitesCount}</Badge>
              <Badge variant="outline">Coaches: {visibleCoachesCount}</Badge>
            </div>

            {latestSyncRun?.status === "failed" && latestSyncRun.error_message ? (
              <p className="w-full text-sm text-destructive">
                Last refresh failed: {latestSyncRun.error_message}
              </p>
            ) : null}
            {!latestSyncRun ? (
              <p className="w-full text-xs text-muted-foreground">
                Refresh run log table not found yet, so this health status is derived from
                `programs.updated_at`.
              </p>
            ) : null}
            {syncErrorMessage ? (
              <p className="w-full text-sm text-destructive">
                Could not load refresh health: {syncErrorMessage}
              </p>
            ) : null}
            {fallbackCountError ? (
              <p className="w-full text-sm text-destructive">
                Could not load fallback sync stats: {fallbackCountError}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-primary/10 bg-white">
          <CardHeader>
            <CardTitle className="text-primary">Find Programs</CardTitle>
          </CardHeader>
          <CardContent>
            <form method="get" className="grid gap-3 md:grid-cols-5">
              <label className="md:col-span-2">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  School Name
                </span>
                <input
                  type="text"
                  name="q"
                  defaultValue={q}
                  placeholder="Vanderbilt, Dallas Baptist, etc."
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
                />
              </label>

              <label>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Division
                </span>
                <select
                  name="division"
                  defaultValue={division}
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
                >
                  <option value="">All divisions</option>
                  {divisionOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  State
                </span>
                <select
                  name="state"
                  defaultValue={state}
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
                >
                  <option value="">All states</option>
                  {stateOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Conference
                </span>
                <select
                  name="conference"
                  defaultValue={conference}
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
                >
                  <option value="">All conferences</option>
                  {conferenceOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex items-end gap-2 md:col-span-5">
                <button
                  type="submit"
                  className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  <Search className="mr-2 h-4 w-4" />
                  Apply filters
                </button>
                {hasFilters ? (
                  <Link
                    href="/programs"
                    className="inline-flex h-9 items-center rounded-md border border-border bg-white px-4 text-sm font-semibold text-primary transition hover:bg-muted"
                  >
                    Clear filters
                  </Link>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{programs.length}</span> of{" "}
            <span className="font-semibold text-foreground">{totalPrograms}</span> programs.
          </p>
          <p className="text-muted-foreground">
            Page <span className="font-semibold text-foreground">{Math.min(page, totalPages)}</span> of{" "}
            <span className="font-semibold text-foreground">{totalPages}</span>
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-border bg-white p-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School</TableHead>
                <TableHead>Division</TableHead>
                <TableHead>Conference</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Head Coach</TableHead>
                <TableHead>Website</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {programs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No programs matched your filters.
                  </TableCell>
                </TableRow>
              ) : (
                programs.map((program) => {
                  const location =
                    [program.city, program.state].filter(Boolean).join(", ") || "—";
                  const coach = coachByProgramId.get(program.id) ?? "—";
                  return (
                    <TableRow key={program.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/programs/${program.id}`}
                          className="underline-offset-2 transition hover:text-primary hover:underline"
                        >
                          {program.name}
                        </Link>
                      </TableCell>
                      <TableCell>{program.division ?? "—"}</TableCell>
                      <TableCell>{program.conference ?? "—"}</TableCell>
                      <TableCell>{location}</TableCell>
                      <TableCell>{coach}</TableCell>
                      <TableCell>
                        {program.website ? (
                          <a
                            href={program.website}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
                          >
                            Visit
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <Link
            href={prevPageHref}
            aria-disabled={page <= 1}
            className={`inline-flex h-9 items-center rounded-md border px-4 text-sm font-semibold transition ${
              page <= 1
                ? "pointer-events-none border-border/60 text-muted-foreground/60"
                : "border-border bg-white text-primary hover:bg-muted"
            }`}
          >
            Previous
          </Link>

          <Link
            href={nextPageHref}
            aria-disabled={page >= totalPages}
            className={`inline-flex h-9 items-center rounded-md border px-4 text-sm font-semibold transition ${
              page >= totalPages
                ? "pointer-events-none border-border/60 text-muted-foreground/60"
                : "border-border bg-white text-primary hover:bg-muted"
            }`}
          >
            Next
          </Link>
        </div>
      </section>
    </main>
  );
}
