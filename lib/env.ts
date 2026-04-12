const requiredServer = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_ANON_KEY",
] as const;

type RequiredKey = (typeof requiredServer)[number];

function hasValue(value: string | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

function missingKeys(keys: readonly string[]) {
  return keys.filter((key) => !hasValue(process.env[key]));
}

export function hasSupabaseServerEnv() {
  return missingKeys(requiredServer).length === 0;
}

export function getServerEnv() {
  const missing = missingKeys(requiredServer);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}.`,
    );
  }

  return {
    SUPABASE_URL: process.env.SUPABASE_URL as string,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY as string,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "",
    RESEND_API_KEY: process.env.RESEND_API_KEY ?? "",
    RESEND_FROM: process.env.RESEND_FROM ?? "onboarding@resend.dev",
    ADMIN_PASSWORD:
      process.env.ADMIN_PASSWORD_COMMIT ?? process.env.ADMIN_PASSWORD ?? "",
  };
}

export function getAdminPassword() {
  return (
    process.env.ADMIN_PASSWORD_COMMIT ?? process.env.ADMIN_PASSWORD ?? ""
  ).trim();
}

export function getPublicSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY configuration.",
    );
  }

  return {
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: key,
  };
}

export function getOptionalServerEnv() {
  return {
    SUPABASE_URL: process.env.SUPABASE_URL ?? "",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? "",
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "",
    RESEND_API_KEY: process.env.RESEND_API_KEY ?? "",
    RESEND_FROM: process.env.RESEND_FROM ?? "onboarding@resend.dev",
    ADMIN_PASSWORD:
      process.env.ADMIN_PASSWORD_COMMIT ?? process.env.ADMIN_PASSWORD ?? "",
    hasOpenAI: hasValue(process.env.OPENAI_API_KEY),
    hasResend: hasValue(process.env.RESEND_API_KEY),
    resendFrom: process.env.RESEND_FROM || "onboarding@resend.dev",
    hasAdminPassword: hasValue(
      process.env.ADMIN_PASSWORD_COMMIT ?? process.env.ADMIN_PASSWORD ?? "",
    ),
  };
}

export type ServerEnv = ReturnType<typeof getServerEnv> & {
  [K in RequiredKey]: string;
};
