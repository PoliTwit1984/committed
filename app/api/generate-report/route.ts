import { NextResponse } from "next/server";
import { generateRecruitingReport } from "@/lib/openai";
import { demoRequestSchema } from "@/lib/schemas";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { getOptionalServerEnv, hasSupabaseServerEnv } from "@/lib/env";
import { fetchPhase2RecruitingContext } from "@/lib/phase2-context";

export const runtime = "nodejs";

function relationMissing(messageOrCode?: string | null) {
  if (!messageOrCode) {
    return false;
  }
  const normalized = messageOrCode.toLowerCase();
  return normalized.includes("42p01") || normalized.includes("could not find the table");
}

function normalizeOptionalText(value?: string | null) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return value;
}

export async function POST(request: Request) {
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
    const parsed = demoRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request body." },
        { status: 400 },
      );
    }

    const env = getOptionalServerEnv();
    if (!env.hasOpenAI) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is missing on the server." },
        { status: 500 },
      );
    }

    const supabase = hasSupabaseServerEnv() ? createSupabaseAdminClient() : null;
    const phase2Context = supabase
      ? await fetchPhase2RecruitingContext(supabase, parsed.data)
      : undefined;
    const report = await generateRecruitingReport(
      env.OPENAI_API_KEY,
      parsed.data,
      phase2Context,
    );

    if (supabase) {
      try {
        const { error } = await supabase.from("demo_reports").insert({
          player_name: parsed.data.playerName,
          grad_year: parsed.data.gradYear,
          position: parsed.data.position,
          batting_average: normalizeOptionalText(parsed.data.battingAverage),
          era: normalizeOptionalText(parsed.data.era),
          video_link: normalizeOptionalText(parsed.data.videoLink),
          target_schools: normalizeOptionalText(parsed.data.targetSchools),
          report_json: report,
        });
        if (error) {
          if (
            relationMissing(error.code) ||
            relationMissing(error.message) ||
            relationMissing(error.details)
          ) {
            console.warn("demo_reports table not available yet; skipping report persistence.");
          } else {
            console.error("Saving demo report failed:", error.message);
          }
        }
      } catch (dbError) {
        console.error("Saving demo report failed:", dbError);
      }
    }

    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error("Generate report API failed:", error);
    return NextResponse.json(
      { error: "Unable to generate report right now. Please try again." },
      { status: 500 },
    );
  }
}
