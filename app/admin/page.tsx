import Link from "next/link";
import { Download } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { hasSupabaseServerEnv } from "@/lib/env";
import { getRecentWaitlistRows, getWaitlistCount } from "@/lib/waitlist-store";
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

function missingRelation(errorMessage?: string) {
  if (!errorMessage) {
    return false;
  }
  return (
    errorMessage.toLowerCase().includes("could not find the table") ||
    errorMessage.toLowerCase().includes("relation") ||
    errorMessage.toLowerCase().includes("does not exist")
  );
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
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

  const [waitlistCount, waitlistRows, demoCountResult, demoRowsResult] = await Promise.all([
    getWaitlistCount(supabase),
    getRecentWaitlistRows(supabase, 20),
    supabase.from("demo_reports").select("id", { count: "exact", head: true }),
    supabase
      .from("demo_reports")
      .select("player_name,grad_year,position,created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const demoCount = demoCountResult.error
    ? missingRelation(demoCountResult.error.message)
      ? 0
      : 0
    : (demoCountResult.count ?? 0);

  const demoRows = demoRowsResult.error
    ? missingRelation(demoRowsResult.error.message)
      ? []
      : []
    : ((demoRowsResult.data ?? []) as DemoItem[]);

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

      <div className="mt-6 grid gap-4 md:grid-cols-2">
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
                {demoRows.length === 0 ? (
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
    </main>
  );
}
