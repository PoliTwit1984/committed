import OpenAI from "openai";
import { DemoRequestInput, GeneratedReport, generatedReportSchema } from "@/lib/schemas";

function buildSystemPrompt() {
  return [
    "You are Commit Baseball's lead recruiting analyst.",
    "Write with the perspective of a former Division I recruiting coordinator who understands realistic placement outcomes.",
    "Be specific, direct, and honest while staying encouraging to families.",
    "Output must be valid JSON only. No markdown.",
    "Use this JSON shape exactly:",
    JSON.stringify({
      targetSchoolTier: {
        recommendedTier: "string",
        reasoning: "string",
        fitSignals: ["string", "string", "string"],
      },
      schoolRecommendations: [
        {
          school: "string",
          level: "string",
          whyFit: "string",
          recruitingReality: "string",
        },
      ],
      outreachTemplate: {
        subjectLine: "string",
        emailBody: "string",
        followUpText: "string",
      },
      nextSteps: ["string", "string", "string"],
    }),
  ].join(" ");
}

function buildUserPrompt(input: DemoRequestInput) {
  return `
Player Name: ${input.playerName}
Grad Year: ${input.gradYear}
Primary Position: ${input.position}
Batting Average: ${input.battingAverage || "Not provided"}
ERA: ${input.era || "Not provided"}
Video Link: ${input.videoLink || "Not provided"}
Target Schools: ${input.targetSchools || "Not provided"}

Provide:
1) Target school tier recommendation with realistic recruiting fit.
2) Exactly 3 school recommendations from different fit bands.
3) Parent outreach template (subject + short email + text follow-up).
4) 3-6 immediate next steps for the next 30 days.
`.trim();
}

export async function generateRecruitingReport(
  apiKey: string,
  input: DemoRequestInput,
): Promise<GeneratedReport> {
  const client = new OpenAI({ apiKey });

  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.45,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: buildUserPrompt(input) },
    ],
  });

  const message = completion.choices[0]?.message?.content;
  if (!message) {
    throw new Error("OpenAI returned an empty report response.");
  }

  const parsed = JSON.parse(message);
  return generatedReportSchema.parse(parsed);
}
