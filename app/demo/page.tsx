import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DemoForm } from "@/components/demo-form";

export default function DemoPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12 md:py-16">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </Link>
      <header className="mt-4 max-w-3xl">
        <h1 className="font-heading text-4xl text-primary md:text-5xl">
          Demo report generator
        </h1>
        <p className="mt-3 text-muted-foreground">
          Submit player details to preview the recruiting intelligence families receive with
          Commit Baseball.
        </p>
      </header>
      <section className="mt-8">
        <DemoForm />
      </section>
    </main>
  );
}
