import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getOptionalServerEnv, hasSupabaseServerEnv } from "@/lib/env";
import { waitlistSchema } from "@/lib/schemas";
import { createSupabaseAdminClient } from "@/lib/supabase";
import { insertWaitlistEntry } from "@/lib/waitlist-store";

export const runtime = "nodejs";

async function sendWaitlistEmail(
  apiKey: string,
  fromAddress: string,
  toEmail: string,
  position: number,
) {
  const resend = new Resend(apiKey);
  await resend.emails.send({
    to: toEmail,
    from: fromAddress,
    subject: `You’re in for Commit Baseball (Spot #${position})`,
    text: `Hey there,\n\nThanks for joining the Commit Baseball waitlist. You're currently #${position}.\n\nWe'll reach out as soon as beta access opens with your next steps.\n\n— Joe Wilson, Founder`,
    html: `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; color: #132036;">
        <h2 style="margin-bottom: 12px;">You're in for Commit Baseball.</h2>
        <p>Thanks for trusting us with your recruiting journey.</p>
        <p><strong>Your current waitlist position: #${position}</strong></p>
        <p>We'll be in touch as soon as beta access opens.</p>
        <p style="margin-top: 24px;">— Joe Wilson, Founder</p>
      </div>
    `,
  });
}

export async function POST(request: Request) {
  if (!hasSupabaseServerEnv()) {
    return NextResponse.json(
      { error: "Server is missing Supabase configuration." },
      { status: 500 },
    );
  }

  try {
    const body = await request.json();
    const parsed = waitlistSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request body." },
        { status: 400 },
      );
    }

    const supabase = createSupabaseAdminClient();
    const { position, storageMode } = await insertWaitlistEntry(supabase, parsed.data);
    const env = getOptionalServerEnv();

    if (env.hasResend) {
      try {
        await sendWaitlistEmail(env.RESEND_API_KEY, env.resendFrom, parsed.data.email, position);
      } catch (emailError) {
        console.error("Resend confirmation failed:", emailError);
      }
    } else {
      console.info("RESEND_API_KEY not set. Skipping confirmation email.");
    }

    return NextResponse.json({
      success: true,
      position,
      message: `You’re officially on the Commit Baseball waitlist, ${parsed.data.playerName}.`,
      storageMode,
    });
  } catch (error) {
    console.error("Waitlist API failed:", error);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
