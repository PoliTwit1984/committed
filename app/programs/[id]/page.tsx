import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, MapPin } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { hasSupabaseServerEnv } from "@/lib/env";
import { relationMissing } from "@/lib/programs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ProgramDetailRow = {
  id: number;
  name: string;
  division: string | null;
  conference: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  roster_size: number | null;
  scholarship_limit: number | null;
  website: string | null;
  source: string | null;
  source_url: string | null;
  updated_at: string | null;
  created_at: string;
};

type CoachDetailRow = {
  id: number;
  full_name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  recruiting_coordinator: boolean;
  is_active: boolean;
};

type CountResultError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
} | null;

function isTableMissingError(error: CountResultError) {
  if (!error) {
    return false;
  }
  return (
    relationMissing(error.code) ||
    relationMissing(error.message) ||
    relationMissing(error.details)
  );
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

function formatDecimal(value: number | null) {
  if (value === null) {
    return "—";
  }
  const asNumber = Number(value);
  if (!Number.isFinite(asNumber)) {
    return "—";
  }
  return Number.isInteger(asNumber) ? String(asNumber) : asNumber.toFixed(1);
}

function toProgramId(value: string) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return null;
  }
  return parsed;
}

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!hasSupabaseServerEnv()) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="font-heading text-4xl text-primary">Program profile</h1>
        <p className="mt-4 text-muted-foreground">
          Supabase environment variables are missing, so program details cannot be loaded.
        </p>
      </main>
    );
  }

  const resolvedParams = await params;
  const programId = toProgramId(resolvedParams.id);
  if (!programId) {
    notFound();
  }

  const supabase = createSupabaseAdminClient();
  const programResult = await supabase
    .from("programs")
    .select(
      "id,name,division,conference,city,state,country,roster_size,scholarship_limit,website,source,source_url,updated_at,created_at",
    )
    .eq("id", programId)
    .maybeSingle();

  if (isTableMissingError(programResult.error)) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="font-heading text-4xl text-primary">Program profile</h1>
        <p className="mt-4 text-muted-foreground">
          Programs table is not available yet. Apply `supabase/schema.sql` first.
        </p>
      </main>
    );
  }

  if (programResult.error) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="font-heading text-4xl text-primary">Program profile</h1>
        <p className="mt-4 text-destructive">
          Could not load program details: {programResult.error.message}
        </p>
      </main>
    );
  }

  const program = (programResult.data as ProgramDetailRow | null) ?? null;
  if (!program) {
    notFound();
  }

  const [coachesResult, commitmentsCountResult, needsCountResult] = await Promise.all([
    supabase
      .from("coaches")
      .select("id,full_name,role,email,phone,recruiting_coordinator,is_active")
      .eq("program_id", programId)
      .eq("is_active", true)
      .order("recruiting_coordinator", { ascending: false })
      .order("full_name", { ascending: true }),
    supabase
      .from("commitments")
      .select("id", { count: "exact", head: true })
      .eq("committed_program_id", programId),
    supabase
      .from("program_needs")
      .select("id", { count: "exact", head: true })
      .eq("program_id", programId),
  ]);

  const coachesError = isTableMissingError(coachesResult.error)
    ? null
    : coachesResult.error?.message ?? null;
  const commitmentsError = isTableMissingError(commitmentsCountResult.error)
    ? null
    : commitmentsCountResult.error?.message ?? null;
  const needsError = isTableMissingError(needsCountResult.error)
    ? null
    : needsCountResult.error?.message ?? null;

  const coaches = (coachesResult.data ?? []) as CoachDetailRow[];
  const commitmentsTracked = commitmentsError ? null : (commitmentsCountResult.count ?? 0);
  const needsTracked = needsError ? null : (needsCountResult.count ?? 0);
  const location =
    [program.city, program.state, program.country]
      .filter(Boolean)
      .join(", ") || "—";

  return (
    <main className="bg-background text-foreground">
      <section className="border-b border-border bg-white">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <Link
            href="/programs"
            className="inline-flex items-center text-sm font-medium text-muted-foreground transition hover:text-primary"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to explorer
          </Link>

          <h1 className="mt-4 font-heading text-4xl text-primary">{program.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="default">{program.division ?? "Unknown division"}</Badge>
            <Badge variant="outline">{program.conference ?? "Independent/unknown conference"}</Badge>
            <Badge variant="outline">{program.state ?? "No state listed"}</Badge>
          </div>
          <p className="mt-3 inline-flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {location}
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-6 py-8 md:grid-cols-2">
        <Card className="border-primary/10 bg-white">
          <CardHeader>
            <CardTitle className="text-primary">Program Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              <span className="font-semibold">Website:</span>{" "}
              {program.website ? (
                <a
                  href={program.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
                >
                  {program.website}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                "—"
              )}
            </p>
            <p>
              <span className="font-semibold">Source:</span> {program.source ?? "—"}
            </p>
            <p>
              <span className="font-semibold">Source profile:</span>{" "}
              {program.source_url ? (
                <a
                  href={program.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
                >
                  Open source
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                "—"
              )}
            </p>
            <p>
              <span className="font-semibold">Created:</span> {formatDateTime(program.created_at)}
            </p>
            <p>
              <span className="font-semibold">Last updated:</span>{" "}
              {formatDateTime(program.updated_at)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 bg-white">
          <CardHeader>
            <CardTitle className="text-primary">Recruiting Signals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              <span className="font-semibold">Roster size:</span>{" "}
              {program.roster_size ?? "—"}
            </p>
            <p>
              <span className="font-semibold">Scholarship limit:</span>{" "}
              {formatDecimal(program.scholarship_limit)}
            </p>
            <p>
              <span className="font-semibold">Tracked commitments:</span>{" "}
              {commitmentsTracked ?? "—"}
            </p>
            <p>
              <span className="font-semibold">Tracked position needs:</span> {needsTracked ?? "—"}
            </p>
            {commitmentsError ? (
              <p className="text-destructive">Commitment data error: {commitmentsError}</p>
            ) : null}
            {needsError ? (
              <p className="text-destructive">Program-needs data error: {needsError}</p>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-10">
        <Card className="border-primary/10 bg-white">
          <CardHeader>
            <CardTitle className="text-primary">Coaching Staff</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Recruiting Coordinator</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coachesError ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-destructive">
                      Could not load coaches: {coachesError}
                    </TableCell>
                  </TableRow>
                ) : coaches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No coaches tracked for this program yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  coaches.map((coach) => (
                    <TableRow key={coach.id}>
                      <TableCell className="font-medium">{coach.full_name}</TableCell>
                      <TableCell>{coach.role ?? "—"}</TableCell>
                      <TableCell>{coach.email ?? "—"}</TableCell>
                      <TableCell>{coach.phone ?? "—"}</TableCell>
                      <TableCell>{coach.recruiting_coordinator ? "Yes" : "No"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
