import { NextResponse } from "next/server";
import { compose } from "@/src/domain/compose.ts";
import { validate } from "@/src/domain/validate.ts";
import { defaultTemplateConfig } from "@/src/config/templateConfig.ts";
import { generateRequestSchema } from "@/src/api/generateRequestSchema.ts";
import { todayInJst } from "@/src/api/today.ts";
import type { ComposeInput } from "@/src/types.ts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = generateRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "ValidationError", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const d = parsed.data;
  const input: ComposeInput = {
    customerName: d.customerName,
    paymentType: d.paymentType,
    contractDate: d.contractDate,
    salesStaffName: d.salesStaffName,
    assistantStaffName: d.assistantStaffName,
    ccStaffName: d.ccStaffName,
    ...(d.customerEmail !== undefined && { customerEmail: d.customerEmail }),
    ...(d.constructionDate !== undefined && { constructionDate: d.constructionDate }),
    ...(d.constructionDateStatus !== undefined && {
      constructionDateStatus: d.constructionDateStatus,
    }),
    ...(d.bankProcessStatus !== undefined && { bankProcessStatus: d.bankProcessStatus }),
  };
  const draft = compose(input, defaultTemplateConfig);
  const riskFlags = validate(input, draft, defaultTemplateConfig, {
    today: todayInJst(),
  });

  return NextResponse.json({
    templateType: draft.templateType,
    subject: draft.subject,
    body: draft.body,
    nextTask: draft.nextTask,
    riskFlags,
  });
}
