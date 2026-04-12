import { NextResponse } from "next/server";
import { generateRecruitingReport } from "@/lib/openai";
import { demoRequestSchema } from "@/lib/schemas";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { getOptionalServerEnv, hasSupabaseServerEnv } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
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

    const report = await generateRecruitingReport(env.OPENAI_API_KEY, parsed.data);

    if (hasSupabaseServerEnv()) {
      try {
        const supabase = createSupabaseAdminClient();
        await supabase.from("demo_reports").insert({
          player_name: parsed.data.playerName,
          grad_year: parsed.data.gradYear,
          position: parsed.data.position,
          batting_average: parsed.data.battingAverage || null,
          era: parsed.data.era || null,
          video_link: parsed.data.videoLink || null,
          target_schools: parsed.data.targetSchools || null,
          report_json: report,
        });
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
