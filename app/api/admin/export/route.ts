import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { hasSupabaseServerEnv } from "@/lib/env";
import { getRecentWaitlistRows } from "@/lib/waitlist-store";

export const runtime = "nodejs";

function csvEscape(value: unknown) {
  const stringValue = `${value ?? ""}`;
  if (stringValue.includes(",") || stringValue.includes("\"") || stringValue.includes("\n")) {
    return `"${stringValue.replaceAll("\"", "\"\"")}"`;
  }
  return stringValue;
}

export async function GET() {
  if (!hasSupabaseServerEnv()) {
    return NextResponse.json(
      { error: "Supabase environment configuration is missing." },
      { status: 500 },
    );
  }

  const supabase = createSupabaseAdminClient();
  let data;
  try {
    data = await getRecentWaitlistRows(supabase, 10000);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown export error.";
    return NextResponse.json(
      { error: `Could not export waitlist CSV: ${message}` },
      { status: 500 },
    );
  }

  const header = [
    "created_at",
    "email",
    "phone",
    "player_name",
    "grad_year",
    "position",
    "referrer",
    "status",
  ];
  const rows = data.map((row) =>
    header.map((column) => csvEscape(row[column as keyof typeof row])).join(","),
  );

  const csv = [header.join(","), ...rows].join("\n");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="commit-baseball-waitlist.csv"`,
    },
  });
}
