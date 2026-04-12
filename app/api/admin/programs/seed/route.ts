import { NextResponse } from "next/server";
import { hasSupabaseServerEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { relationMissing, upsertPrograms } from "@/lib/programs";
import { starterSchools } from "@/lib/school-seed";

export const runtime = "nodejs";

export async function POST() {
  if (!hasSupabaseServerEnv()) {
    return NextResponse.json(
      { error: "Supabase environment configuration is missing." },
      { status: 500 },
    );
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await upsertPrograms(supabase, starterSchools);

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
        { error: error.message ?? "Unable to seed schools." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      seededCount: starterSchools.length,
      programs: data ?? [],
    });
  } catch (error) {
    console.error("Programs seed failed:", error);
    return NextResponse.json(
      { error: "Unexpected server error while seeding schools." },
      { status: 500 },
    );
  }
}
