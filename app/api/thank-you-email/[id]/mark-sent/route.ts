import { NextResponse } from "next/server";
import { z } from "zod";
import { getEmailStore } from "@/src/store/emailStore.ts";
import {
  assertTransition,
  InvalidTransitionError,
} from "@/src/domain/stateMachine.ts";

export const runtime = "nodejs";

const bodySchema = z.object({
  sentAt: z.string().min(1).optional(),
  sentBy: z.string().min(1).default("system"),
  actualTo: z.string().optional(),
  actualCc: z.array(z.string()).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "ValidationError", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const store = getEmailStore();
  const current = store.get(id);
  if (!current) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  try {
    assertTransition(current.status, "sent");
  } catch (e) {
    if (e instanceof InvalidTransitionError) {
      return NextResponse.json(
        {
          error: "InvalidTransition",
          from: e.from,
          to: e.to,
          hint: "approved 状態でのみ送信済みにできます",
        },
        { status: 409 },
      );
    }
    throw e;
  }

  const sentAt = parsed.data.sentAt ?? new Date().toISOString();
  const updated = store.update(id, (e) => ({
    ...e,
    status: "sent",
    sentAt,
    sentBy: parsed.data.sentBy,
    ...(parsed.data.actualTo !== undefined && { actualTo: parsed.data.actualTo }),
    ...(parsed.data.actualCc !== undefined && { actualCc: parsed.data.actualCc }),
  }));

  store.appendAudit({
    emailId: id,
    action: "mark_sent",
    actor: parsed.data.sentBy,
    fromStatus: current.status,
    toStatus: "sent",
    ...(parsed.data.actualTo ? { note: `to=${parsed.data.actualTo}` } : {}),
  });

  return NextResponse.json(updated);
}
