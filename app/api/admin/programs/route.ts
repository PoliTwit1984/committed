import { NextResponse } from "next/server";
import { hasSupabaseServerEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { programImportSchema } from "@/lib/schemas";
import {
  getProgramsCount,
  getRecentPrograms,
  relationMissing,
  upsertPrograms,
} from "@/lib/programs";

export const runtime = "nodejs";

export async function GET() {
  if (!hasSupabaseServerEnv()) {
    return NextResponse.json(
      { error: "Supabase environment configuration is missing." },
      { status: 500 },
    );
  }

  const supabase = createSupabaseAdminClient();

  try {
    const [countResult, recentResult] = await Promise.all([
      getProgramsCount(supabase),
      getRecentPrograms(supabase, 50),
    ]);

    if (countResult.error || recentResult.error) {
      const error = countResult.error ?? recentResult.error;
      if (
        relationMissing(error?.code) ||
        relationMissing(error?.message) ||
        relationMissing(error?.details)
      ) {
        return NextResponse.json(
          {
            error:
              "Programs table is not available yet. Apply supabase/schema.sql first.",
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        { error: error?.message ?? "Unable to read schools right now." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      totalPrograms: countResult.count ?? 0,
      recentPrograms: recentResult.data ?? [],
    });
  } catch (error) {
    console.error("Programs GET failed:", error);
    return NextResponse.json(
      { error: "Unexpected server error while loading schools." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!hasSupabaseServerEnv()) {
    return NextResponse.json(
      { error: "Supabase environment configuration is missing." },
      { status: 500 },
    );
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    const parsed = programImportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request body." },
        { status: 400 },
      );
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await upsertPrograms(supabase, parsed.data.programs);

    if (error) {
      if (
        relationMissing(error.code) ||
        relationMissing(error.message) ||
        relationMissing(error.details)
      ) {
        return NextResponse.json(
          {
            error:
              "Programs table is not available yet. Apply supabase/schema.sql first.",
          },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: error.message ?? "Unable to import schools." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      importedCount: parsed.data.programs.length,
      programs: data ?? [],
    });
  } catch (error) {
    console.error("Programs POST failed:", error);
    return NextResponse.json(
      { error: "Unexpected server error while importing schools." },
      { status: 500 },
    );
  }
}
