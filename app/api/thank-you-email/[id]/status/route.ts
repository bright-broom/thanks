import { NextResponse } from "next/server";
import { z } from "zod";
import { getEmailStore } from "@/src/store/emailStore.ts";
import {
  assertTransition,
  InvalidTransitionError,
} from "@/src/domain/stateMachine.ts";

export const runtime = "nodejs";

const bodySchema = z.object({
  status: z.enum([
    "not_created",
    "draft_generated",
    "pending_review",
    "approved",
    "sent",
    "on_hold",
    "error",
  ]),
  actor: z.string().default("system"),
});

export async function PATCH(
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
    assertTransition(current.status, parsed.data.status);
  } catch (e) {
    if (e instanceof InvalidTransitionError) {
      return NextResponse.json(
        { error: "InvalidTransition", from: e.from, to: e.to },
        { status: 409 },
      );
    }
    throw e;
  }

  if (parsed.data.status === "sent") {
    return NextResponse.json(
      { error: "Use /mark-sent endpoint to record send", path: "/mark-sent" },
      { status: 400 },
    );
  }

  const updated = store.update(id, (e) => ({ ...e, status: parsed.data.status }));
  store.appendAudit({
    emailId: id,
    action: parsed.data.status === "on_hold" ? "hold" : "transition",
    actor: parsed.data.actor,
    fromStatus: current.status,
    toStatus: updated.status,
  });

  return NextResponse.json(updated);
}
