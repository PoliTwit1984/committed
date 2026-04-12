import Link from "next/link";
import { Download } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { hasSupabaseServerEnv } from "@/lib/env";
import { getRecentWaitlistRows, getWaitlistCount } from "@/lib/waitlist-store";
import { getProgramsCount, getRecentPrograms, relationMissing } from "@/lib/programs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

type WaitlistItem = {
  email: string;
  player_name: string;
  grad_year: string;
  position: string;
  created_at: string;
};

type DemoItem = {
  player_name: string;
  grad_year: string;
  position: string;
  created_at: string;
};

type ProgramItem = {
  name: string;
  division: string | null;
  conference: string | null;
  city: string | null;
  state: string | null;
  created_at: string;
};

type QueryError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
} | null;

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
}

function tableErrorMessage(error: QueryError) {
  if (!error) {
    return null;
  }

  if (
    relationMissing(error.code) ||
    relationMissing(error.message) ||
    relationMissing(error.details)
  ) {
    return null;
  }

  return error.message ?? "Unknown query error.";
}

export default async function AdminPage() {
  if (!hasSupabaseServerEnv()) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="font-heading text-4xl text-primary">Admin dashboard</h1>
        <p className="mt-4 text-muted-foreground">
          Supabase environment variables are missing, so admin reporting is unavailable.
        </p>
      </main>
    );
  }

  const supabase = createSupabaseAdminClient();

  const [
    waitlistCount,
    waitlistRows,
    demoCountResult,
    demoRowsResult,
    programsCountResult,
    programsRowsResult,
  ] = await Promise.all([
    getWaitlistCount(supabase),
    getRecentWaitlistRows(supabase, 20),
    supabase.from("demo_reports").select("id", { count: "exact", head: true }),
    supabase
      .from("demo_reports")
      .select("player_name,grad_year,position,created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    getProgramsCount(supabase),
    getRecentPrograms(supabase, 10),
  ]);

  const demoCountError = tableErrorMessage(demoCountResult.error);
  const demoRowsError = tableErrorMessage(demoRowsResult.error);
  const demoError = demoCountError ?? demoRowsError;

  const programsCountError = tableErrorMessage(programsCountResult.error);
  const programsRowsError = tableErrorMessage(programsRowsResult.error);
  const programsError = programsCountError ?? programsRowsError;

  const demoCount = demoCountError ? 0 : (demoCountResult.count ?? 0);
  const demoRows = demoRowsError ? [] : ((demoRowsResult.data ?? []) as DemoItem[]);

  const programsCount = programsCountError ? 0 : (programsCountResult.count ?? 0);
  const programsRows = programsRowsError
    ? []
    : ((programsRowsResult.data ?? []) as ProgramItem[]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-4xl text-primary">Commit Baseball admin</h1>
        <Link
          href="/api/admin/export"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          <Download className="mr-2 h-4 w-4" />
          Export waitlist CSV
        </Link>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Waitlist signups</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-4xl text-foreground">{waitlistCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Demo reports generated</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-4xl text-foreground">{demoCount ?? 0}</p>
            {demoError ? (
              <p className="mt-2 text-xs text-destructive">
                Error loading demo metrics: {demoError}
              </p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Schools in database</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-heading text-4xl text-foreground">{programsCount}</p>
            {programsError ? (
              <p className="mt-2 text-xs text-destructive">
                Error loading school metrics: {programsError}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <section className="mt-8 space-y-4">
        <h2 className="font-heading text-2xl text-primary">Recent waitlist signups</h2>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead>Grad year</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {waitlistRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No signups yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  waitlistRows.map((entry: WaitlistItem) => (
                    <TableRow key={`${entry.email}-${entry.created_at}`}>
                      <TableCell>{entry.email}</TableCell>
                      <TableCell>{entry.player_name}</TableCell>
                      <TableCell>{entry.grad_year}</TableCell>
                      <TableCell>{entry.position}</TableCell>
                      <TableCell>{formatDate(entry.created_at)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="font-heading text-2xl text-primary">Recent demo reports</h2>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Grad year</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demoError ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-destructive">
                      Error loading recent reports: {demoError}
                    </TableCell>
                  </TableRow>
                ) : demoRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No reports generated yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  demoRows.map((entry) => (
                    <TableRow key={`${entry.player_name}-${entry.created_at}`}>
                      <TableCell>{entry.player_name}</TableCell>
                      <TableCell>{entry.grad_year}</TableCell>
                      <TableCell>{entry.position}</TableCell>
                      <TableCell>{formatDate(entry.created_at)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <section className="mt-8 space-y-4">
        <h2 className="font-heading text-2xl text-primary">Recent schools</h2>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>School</TableHead>
                  <TableHead>Division</TableHead>
                  <TableHead>Conference</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {programsError ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-destructive">
                      Error loading schools: {programsError}
                    </TableCell>
                  </TableRow>
                ) : programsRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No schools loaded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  programsRows.map((entry) => (
                    <TableRow key={`${entry.name}-${entry.created_at}`}>
                      <TableCell>{entry.name}</TableCell>
                      <TableCell>{entry.division ?? "—"}</TableCell>
                      <TableCell>{entry.conference ?? "—"}</TableCell>
                      <TableCell>
                        {[entry.city, entry.state].filter(Boolean).join(", ") || "—"}
                      </TableCell>
                      <TableCell>{formatDate(entry.created_at)}</TableCell>
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
