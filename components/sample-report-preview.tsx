import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const sample = {
  targetSchoolTier: {
    recommendedTier: "D1 Mid + D2 High",
    reasoning:
      "Jake's bat speed and outfield range profile as legitimate college tools, but current strength and carry metrics suggest his best near-term fit is in competitive mid-major D1 programs and high-academic D2s where he can impact by year two.",
    fitSignals: [
      "Plus speed in center field with projectable frame",
      "Consistent barrel contact against quality summer pitching",
      "Strong GPA keeps high-academic programs in play",
    ],
  },
  schools: [
    {
      name: "Wofford College",
      level: "D1 (SoCon)",
      reason:
        "Strong development culture for athletic outfielders and an offense that values on-base pressure.",
    },
    {
      name: "University of Tampa",
      level: "D2",
      reason:
        "National-caliber development with direct path for athletes who can defend and run right away.",
    },
    {
      name: "Grayson College",
      level: "JUCO",
      reason:
        "Great bridge option if Jake needs one extra development year before moving to D1.",
    },
  ],
  outreach:
    "Coach [Last Name], my son Jake Thompson (2027 OF, 6'0\", 180) is interested in your program. He posted a .352 summer average with 18 SB and can send verified 60-yard and exit-velocity data. We'd appreciate your feedback on where he fits your 2027 recruiting board.",
};

export function SampleReportPreview() {
  return (
    <div className="mt-9 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <Card className="border-primary/10 bg-white">
        <CardHeader>
          <CardTitle className="text-xl text-primary">
            Target school tier: {sample.targetSchoolTier.recommendedTier}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>{sample.targetSchoolTier.reasoning}</p>
          <ul className="space-y-2">
            {sample.targetSchoolTier.fitSignals.map((signal) => (
              <li key={signal} className="rounded-md bg-muted px-3 py-2 text-foreground/90">
                {signal}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card className="border-primary/10 bg-white">
        <CardHeader>
          <CardTitle className="text-xl text-primary">School recommendations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sample.schools.map((school) => (
            <div key={school.name} className="rounded-md border border-border p-3">
              <p className="text-sm font-semibold text-primary">{school.name}</p>
              <p className="text-xs text-muted-foreground">{school.level}</p>
              <p className="mt-2 text-sm text-foreground/90">{school.reason}</p>
            </div>
          ))}
          <div>
            <p className="mb-2 text-sm font-semibold text-primary">Outreach starter</p>
            <p className="rounded-md bg-muted px-3 py-3 text-sm text-foreground/90">
              {sample.outreach}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
