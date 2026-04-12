import Link from "next/link";
import { ArrowRight, CheckCircle2, Compass, Mail, Search } from "lucide-react";
import { WaitlistForm } from "@/components/waitlist-form";
import { SampleReportPreview } from "@/components/sample-report-preview";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const painPoints = [
  "Most families spend thousands on showcases without a clear recruiting strategy.",
  "Coaches get flooded with generic emails that never get opened.",
  "Talented players fall through the cracks because they target the wrong schools.",
];

const stats = [
  { value: "472k", label: "High school baseball players in the U.S." },
  { value: "$5k-$20k", label: "Annual spend families put into recruiting" },
  { value: "3%", label: "HS players who will play NCAA baseball" },
];

const steps = [
  {
    icon: Mail,
    title: "Sign up",
    body: "Tell us who your player is and where they are in the process.",
  },
  {
    icon: Search,
    title: "Share stats and film",
    body: "Add measurable performance data and optional video links in minutes.",
  },
  {
    icon: Compass,
    title: "Get your recruiting game plan",
    body: "Receive school-fit analysis, outreach language, and practical next moves.",
  },
];

export default function Home() {
  return (
    <main className="bg-background text-foreground">
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,#ff6b3520,transparent_45%),radial-gradient(circle_at_left,#0a162812,transparent_40%)]" />
        <div className="relative mx-auto max-w-6xl px-6 py-16 md:py-24">
          <Badge className="mb-6 bg-primary/10 text-primary hover:bg-primary/10">
            Built for serious baseball families
          </Badge>
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div>
              <h1 className="font-heading text-4xl leading-tight text-primary md:text-6xl">
                Stop guessing your way through college baseball recruiting.
              </h1>
              <p className="mt-5 max-w-xl text-lg text-muted-foreground md:text-xl">
                Commit Baseball is your AI recruiting intelligence partner. We turn stats,
                film, and goals into a practical plan your family can execute.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a
                  href="#waitlist"
                  className="inline-flex items-center rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  Join the waitlist
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
                <Link
                  href="/demo"
                  className="inline-flex items-center rounded-md border border-border bg-white px-5 py-3 text-sm font-semibold text-primary transition hover:bg-muted"
                >
                  Try the demo report
                </Link>
              </div>
              <div className="mt-10 grid gap-3 sm:grid-cols-3">
                {stats.map((stat) => (
                  <Card key={stat.value} className="border-primary/10 bg-white">
                    <CardContent className="px-4 py-4">
                      <p className="font-heading text-2xl text-primary">{stat.value}</p>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            <Card
              id="waitlist"
              className="border-primary/15 bg-white shadow-[0_10px_35px_-18px_rgba(10,22,40,0.45)]"
            >
              <CardContent className="p-6 md:p-8">
                <h2 className="font-heading text-2xl text-primary">Get early access</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Free for the first 100 waitlist families. Launch pricing is $29/month.
                </p>
                <WaitlistForm />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <h2 className="font-heading text-3xl text-primary md:text-4xl">
          The recruiting process is broken
        </h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Families are told to spend more, attend more showcases, and send more emails.
          Without a strategy, that usually means more stress and fewer real opportunities.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {painPoints.map((point) => (
            <Card key={point} className="border-border/60 bg-card">
              <CardContent className="flex gap-3 px-5 py-5">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <p className="text-sm text-foreground/90">{point}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator />

      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <h2 className="font-heading text-3xl text-primary md:text-4xl">
          Meet your AI recruiting coach
        </h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Commit Baseball combines recruiting logic, school-fit data, and communication
          best practices so your player gets seen by the right programs.
        </p>
        <div className="mt-9 grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <Card key={step.title} className="border-primary/10 bg-white">
              <CardContent className="px-5 py-6">
                <step.icon className="h-5 w-5 text-accent" />
                <h3 className="mt-4 font-heading text-2xl text-primary">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-primary/5 py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-heading text-3xl text-primary md:text-4xl">
            Sample recruiting intelligence report
          </h2>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            Example output for a fictional player: Jake Thompson, OF, Class of 2027.
          </p>
          <SampleReportPreview />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 text-center md:py-20">
        <p className="font-heading text-3xl text-primary md:text-4xl">
          $29/month when we launch.
        </p>
        <p className="mt-3 text-muted-foreground">
          First 100 waitlist members get free access during beta.
        </p>
        <a
          href="#waitlist"
          className="mt-8 inline-flex items-center rounded-md bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent/90"
        >
          Reserve your family&apos;s spot
        </a>
      </section>

      <footer className="border-t border-border bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Commit Baseball. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/demo" className="hover:text-primary">
              Demo report
            </Link>
            <a href="#waitlist" className="hover:text-primary">
              Waitlist
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
