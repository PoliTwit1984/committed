"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { track } from "@vercel/analytics";
import {
  demoRequestSchema,
  generatedReportSchema,
  type DemoRequestFormInput,
} from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const years = Array.from({ length: 8 }, (_, index) => `${2026 + index}`);

const loadingMessages = [
  "Reading your player profile...",
  "Scouting school-fit opportunities...",
  "Drafting coach outreach language...",
  "Finalizing your recruiting action plan...",
];

export function DemoForm() {
  const [started, setStarted] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [report, setReport] = useState<ReturnType<typeof generatedReportSchema.parse> | null>(
    null,
  );

  const form = useForm<DemoRequestFormInput>({
    resolver: zodResolver(demoRequestSchema),
    defaultValues: {
      playerName: "",
      gradYear: years[1],
      position: "OF",
      battingAverage: "",
      era: "",
      videoLink: "",
      targetSchools: "",
    },
  });

  useEffect(() => {
    if (!form.formState.isSubmitting) {
      return;
    }

    setLoadingMessageIndex(0);
    const timer = setInterval(() => {
      setLoadingMessageIndex((previous) => (previous + 1) % loadingMessages.length);
    }, 2400);

    return () => clearInterval(timer);
  }, [form.formState.isSubmitting]);

  const startTracking = () => {
    if (!started) {
      setStarted(true);
      track("demo_form_started");
    }
  };

  async function onSubmit(values: DemoRequestFormInput) {
    setErrorMessage("");
    setReport(null);
    const payload = demoRequestSchema.parse(values);

    const response = await fetch("/api/generate-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const responsePayload = await response.json();
    if (!response.ok) {
      setErrorMessage(responsePayload.error ?? "Could not generate a report.");
      return;
    }

    const parsed = generatedReportSchema.safeParse(responsePayload.report);
    if (!parsed.success) {
      setErrorMessage("The report came back in an unexpected format. Please try again.");
      return;
    }

    track("demo_report_generated");
    setReport(parsed.data);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <Card className="border-primary/10 bg-white">
        <CardHeader>
          <CardTitle className="text-2xl text-primary">Generate a demo report</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="playerName">Player name</Label>
              <Input
                id="playerName"
                placeholder="Jake Thompson"
                {...form.register("playerName")}
                onFocus={startTracking}
              />
              {form.formState.errors.playerName ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.playerName.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="gradYear">Grad year</Label>
                <select
                  id="gradYear"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  {...form.register("gradYear")}
                  onFocus={startTracking}
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <select
                  id="position"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  {...form.register("position")}
                  onFocus={startTracking}
                >
                  {["P", "C", "1B", "2B", "3B", "SS", "OF", "LHP", "RHP"].map((position) => (
                    <option key={position} value={position}>
                      {position}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="battingAverage">Batting average (optional)</Label>
                <Input
                  id="battingAverage"
                  placeholder=".342"
                  {...form.register("battingAverage")}
                  onFocus={startTracking}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="era">ERA (required for pitchers)</Label>
                <Input
                  id="era"
                  placeholder="2.14"
                  {...form.register("era")}
                  onFocus={startTracking}
                />
                {form.formState.errors.era ? (
                  <p className="text-xs text-destructive">{form.formState.errors.era.message}</p>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="videoLink">Video link (optional)</Label>
              <Input
                id="videoLink"
                placeholder="https://youtube.com/..."
                {...form.register("videoLink")}
                onFocus={startTracking}
              />
              {form.formState.errors.videoLink ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.videoLink.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetSchools">Target schools (optional)</Label>
              <Textarea
                id="targetSchools"
                placeholder="Example: Samford, Missouri State, DBU"
                rows={3}
                {...form.register("targetSchools")}
                onFocus={startTracking}
              />
            </div>

            {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting
                ? loadingMessages[loadingMessageIndex]
                : "Generate recruiting report"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-primary/10 bg-white">
        <CardHeader>
          <CardTitle className="text-2xl text-primary">Your report output</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {!report ? (
            <div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
              Fill out the form and generate a report to see school-fit guidance, outreach
              messaging, and action steps.
            </div>
          ) : (
            <>
              <section>
                <p className="text-sm font-semibold text-primary">Target school tier</p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {report.targetSchoolTier.recommendedTier}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {report.targetSchoolTier.reasoning}
                </p>
                <ul className="mt-3 space-y-2 text-sm text-foreground/90">
                  {report.targetSchoolTier.fitSignals.map((signal) => (
                    <li key={signal} className="rounded-md bg-muted px-3 py-2">
                      {signal}
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <p className="text-sm font-semibold text-primary">School recommendations</p>
                <div className="mt-2 space-y-3">
                  {report.schoolRecommendations.map((school) => (
                    <div key={school.school} className="rounded-md border border-border p-3">
                      <p className="font-semibold text-foreground">{school.school}</p>
                      <p className="text-xs text-muted-foreground">{school.level}</p>
                      <p className="mt-2 text-sm text-foreground/90">{school.whyFit}</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Recruiting reality: {school.recruitingReality}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <p className="text-sm font-semibold text-primary">Outreach template</p>
                <div className="mt-2 rounded-md border border-border bg-muted/20 p-3 text-sm">
                  <p className="font-semibold text-foreground">
                    Subject: {report.outreachTemplate.subjectLine}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-foreground/90">
                    {report.outreachTemplate.emailBody}
                  </p>
                  <p className="mt-2 text-muted-foreground">
                    Follow-up text: {report.outreachTemplate.followUpText}
                  </p>
                </div>
              </section>

              <section>
                <p className="text-sm font-semibold text-primary">Next steps (30 days)</p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-foreground/90">
                  {report.nextSteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              </section>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
