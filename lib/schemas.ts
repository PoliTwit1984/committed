import { z } from "zod";

export const positions = [
  "P",
  "C",
  "1B",
  "2B",
  "3B",
  "SS",
  "OF",
  "LHP",
  "RHP",
] as const;

export const waitlistSchema = z.object({
  email: z.email("Use a valid email address."),
  phone: z
    .string()
    .trim()
    .min(7, "Phone number is required.")
    .max(20, "Phone number is too long."),
  playerName: z
    .string()
    .trim()
    .min(2, "Player name is required.")
    .max(120, "Player name is too long."),
  gradYear: z
    .string()
    .trim()
    .regex(/^20\d{2}$/, "Use a valid graduation year."),
  position: z.enum(positions),
  referrer: z.string().trim().max(250).optional().default(""),
});

export type WaitlistInput = z.output<typeof waitlistSchema>;
export type WaitlistFormInput = z.input<typeof waitlistSchema>;

export const demoRequestSchema = z
  .object({
    playerName: z.string().trim().min(2).max(120),
    gradYear: z
      .string()
      .trim()
      .regex(/^20\d{2}$/, "Use a valid graduation year."),
    position: z.enum(positions),
    battingAverage: z.string().trim().max(12).optional().default(""),
    era: z.string().trim().max(12).optional().default(""),
    videoLink: z.url("Use a valid video URL.").optional().or(z.literal("")),
    targetSchools: z.string().trim().max(300).optional().default(""),
  })
  .superRefine((value, ctx) => {
    const pitcher = value.position.includes("P");
    if (pitcher && value.era.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["era"],
        message: "ERA is required for pitchers.",
      });
    }
  });

export type DemoRequestInput = z.output<typeof demoRequestSchema>;
export type DemoRequestFormInput = z.input<typeof demoRequestSchema>;

export const generatedReportSchema = z.object({
  targetSchoolTier: z.object({
    recommendedTier: z.string().min(2),
    reasoning: z.string().min(30),
    fitSignals: z.array(z.string().min(5)).min(3).max(5),
  }),
  schoolRecommendations: z
    .array(
      z.object({
        school: z.string().min(2),
        level: z.string().min(2),
        whyFit: z.string().min(20),
        recruitingReality: z.string().min(20),
      }),
    )
    .length(3),
  outreachTemplate: z.object({
    subjectLine: z.string().min(8),
    emailBody: z.string().min(120),
    followUpText: z.string().min(40),
  }),
  nextSteps: z.array(z.string().min(10)).min(3).max(6),
});

export type GeneratedReport = z.infer<typeof generatedReportSchema>;
