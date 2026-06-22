import { NextResponse } from "next/server";
import { z } from "zod";
import { getEmailStore } from "@/src/store/emailStore.ts";

export const runtime = "nodejs";

const bodySchema = z.object({
  body: z.string().min(1),
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
  if (current.status === "sent") {
    return NextResponse.json(
      { error: "送信済みメールは編集できません" },
      { status: 409 },
    );
  }

  const updated = store.update(id, (e) => ({ ...e, bodyOverride: parsed.data.body }));
  store.appendAudit({
    emailId: id,
    action: "edit_body",
    actor: parsed.data.actor,
  });

  return NextResponse.json(updated);
}
