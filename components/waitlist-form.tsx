"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { track } from "@vercel/analytics";
import { waitlistSchema, type WaitlistFormInput } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const years = Array.from({ length: 8 }, (_, index) => `${2026 + index}`);

export function WaitlistForm() {
  const [started, setStarted] = useState(false);
  const [submission, setSubmission] = useState<{
    position: number;
    message: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const referrer = useMemo(
    () => (typeof document !== "undefined" ? document.referrer || "direct" : "direct"),
    [],
  );

  const form = useForm<WaitlistFormInput>({
    resolver: zodResolver(waitlistSchema),
    defaultValues: {
      email: "",
      phone: "",
      playerName: "",
      gradYear: years[1],
      position: "OF",
      referrer,
    },
  });

  const startTracking = () => {
    if (!started) {
      setStarted(true);
      track("waitlist_form_started");
    }
  };

  async function onSubmit(values: WaitlistFormInput) {
    setErrorMessage("");
    const payload = waitlistSchema.parse(values);
    const response = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const responsePayload = await response.json();
    if (!response.ok) {
      setErrorMessage(responsePayload.error ?? "Could not save your submission.");
      return;
    }

    track("waitlist_form_completed");
    setSubmission({
      position: responsePayload.position ?? 0,
      message: responsePayload.message ?? "You are on the list.",
    });
  }

  if (submission) {
    return (
      <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <p className="font-heading text-xl text-primary">
          You&apos;re #{submission.position} on the waitlist.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {submission.message} We&apos;ll email you as soon as beta invitations open.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="playerName">Player name</Label>
        <Input
          id="playerName"
          placeholder="Jake Thompson"
          {...form.register("playerName")}
          onFocus={startTracking}
        />
        {form.formState.errors.playerName ? (
          <p className="text-xs text-destructive">{form.formState.errors.playerName.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Parent email</Label>
        <Input
          id="email"
          type="email"
          placeholder="parent@email.com"
          {...form.register("email")}
          onFocus={startTracking}
        />
        {form.formState.errors.email ? (
          <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Parent phone</Label>
        <Input
          id="phone"
          placeholder="(555) 555-0199"
          {...form.register("phone")}
          onFocus={startTracking}
        />
        {form.formState.errors.phone ? (
          <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
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
          {form.formState.errors.gradYear ? (
            <p className="text-xs text-destructive">{form.formState.errors.gradYear.message}</p>
          ) : null}
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
          {form.formState.errors.position ? (
            <p className="text-xs text-destructive">{form.formState.errors.position.message}</p>
          ) : null}
        </div>
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Saving your spot..." : "Join waitlist"}
      </Button>
    </form>
  );
}
