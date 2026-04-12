import { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { WaitlistInput } from "@/lib/schemas";

export type WaitlistRow = {
  email: string;
  phone: string;
  player_name: string;
  grad_year: string;
  position: string;
  referrer: string;
  status: string;
  created_at: string;
};

const FALLBACK_PREFIX = "commit-baseball|";

function relationMissing(error: PostgrestError | null) {
  if (!error) {
    return false;
  }
  return (
    error.code === "42P01" ||
    error.message.toLowerCase().includes("could not find the table")
  );
}

function encodeFallbackSource(payload: Omit<WaitlistRow, "created_at">) {
  return `${FALLBACK_PREFIX}${JSON.stringify(payload)}`;
}

function decodeFallbackRow(createdAt: string, email: string, source?: string | null): WaitlistRow {
  if (!source || !source.startsWith(FALLBACK_PREFIX)) {
    return {
      email,
      phone: "n/a",
      player_name: "Unknown",
      grad_year: "Unknown",
      position: "Unknown",
      referrer: "direct",
      status: "new",
      created_at: createdAt,
    };
  }

  try {
    const parsed = JSON.parse(source.slice(FALLBACK_PREFIX.length));
    return {
      email,
      phone: parsed.phone ?? "n/a",
      player_name: parsed.player_name ?? "Unknown",
      grad_year: parsed.grad_year ?? "Unknown",
      position: parsed.position ?? "Unknown",
      referrer: parsed.referrer ?? "direct",
      status: parsed.status ?? "new",
      created_at: createdAt,
    };
  } catch {
    return {
      email,
      phone: "n/a",
      player_name: "Unknown",
      grad_year: "Unknown",
      position: "Unknown",
      referrer: "direct",
      status: "new",
      created_at: createdAt,
    };
  }
}

async function insertIntoFallback(
  supabase: SupabaseClient,
  payload: Omit<WaitlistRow, "created_at">,
) {
  const { error: insertError } = await supabase.from("sashanoire_subscribers").insert({
    email: payload.email,
    source: encodeFallbackSource(payload),
  });

  if (insertError) {
    throw new Error(`Could not save fallback waitlist entry: ${insertError.message}`);
  }

  const { count, error: countError } = await supabase
    .from("sashanoire_subscribers")
    .select("id", { count: "exact", head: true })
    .like("source", `${FALLBACK_PREFIX}%`);

  if (countError) {
    return 1;
  }

  return Math.max(count ?? 1, 1);
}

export async function insertWaitlistEntry(supabase: SupabaseClient, payload: WaitlistInput) {
  const entry = {
    email: payload.email,
    phone: payload.phone,
    player_name: payload.playerName,
    grad_year: payload.gradYear,
    position: payload.position,
    referrer: payload.referrer || "direct",
    status: "new",
  } as const;

  const insertPrimary = await supabase.from("waitlist").insert(entry);

  if (!insertPrimary.error) {
    const { count, error: countError } = await supabase
      .from("waitlist")
      .select("id", { count: "exact", head: true });
    return { position: countError ? 1 : Math.max(count ?? 1, 1), storageMode: "waitlist" as const };
  }

  if (!relationMissing(insertPrimary.error)) {
    throw new Error(insertPrimary.error.message);
  }

  const fallbackPosition = await insertIntoFallback(supabase, entry);
  return { position: fallbackPosition, storageMode: "fallback" as const };
}

export async function getWaitlistCount(supabase: SupabaseClient) {
  const primary = await supabase.from("waitlist").select("id", { count: "exact", head: true });
  if (!primary.error) {
    return primary.count ?? 0;
  }

  if (!relationMissing(primary.error)) {
    throw new Error(primary.error.message);
  }

  const fallback = await supabase
    .from("sashanoire_subscribers")
    .select("id", { count: "exact", head: true })
    .like("source", `${FALLBACK_PREFIX}%`);

  if (fallback.error) {
    throw new Error(fallback.error.message);
  }

  return fallback.count ?? 0;
}

export async function getRecentWaitlistRows(supabase: SupabaseClient, limit: number) {
  const primary = await supabase
    .from("waitlist")
    .select("email,phone,player_name,grad_year,position,referrer,status,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!primary.error) {
    return primary.data as WaitlistRow[];
  }

  if (!relationMissing(primary.error)) {
    throw new Error(primary.error.message);
  }

  const fallback = await supabase
    .from("sashanoire_subscribers")
    .select("email,source,created_at")
    .like("source", `${FALLBACK_PREFIX}%`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (fallback.error) {
    throw new Error(fallback.error.message);
  }

  return (fallback.data ?? []).map((row) =>
    decodeFallbackRow(row.created_at, row.email, row.source),
  );
}
