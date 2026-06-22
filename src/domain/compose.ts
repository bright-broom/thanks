import type {
  ComposeInput,
  DraftEmail,
  NextTask,
  TemplateConfig,
} from "../types.ts";
import { interpolate } from "./interpolate.ts";
import { addDays } from "./date.ts";

export function compose(input: ComposeInput, config: TemplateConfig): DraftEmail {
  const subject = buildSubject(input, config);
  const body = buildBody(input, config);
  const nextTask = buildNextTask(input, config);
  return {
    templateType: input.paymentType,
    subject,
    body,
    nextTask,
  };
}

function buildSubject(input: ComposeInput, config: TemplateConfig): string {
  const template =
    config.subjectStyle === "legacy" ? config.subjectLegacy : config.subjectRecommended;
  return interpolate(template, { customerName: input.customerName });
}

function buildBody(input: ComposeInput, config: TemplateConfig): string {
  const senderSignature = interpolate(config.senderSignatureTemplate, {
    salesStaffName: input.salesStaffName,
  });

  const commonValues: Record<string, string> = {
    customerName: input.customerName,
    salesStaffName: input.salesStaffName,
    assistantStaffName: input.assistantStaffName,
    companyName: config.companyName,
    assistantTeamName: config.assistantTeamName,
    documentReturnAddress: config.documentReturnAddress,
    senderSignature,
  };

  if (input.paymentType === "bank_loan") {
    return interpolate(config.bankLoanBodyTemplate, {
      ...commonValues,
      bankFollowUpDays: String(config.bankFollowUpDays),
    });
  }

  return interpolate(config.cashBodyTemplate, {
    ...commonValues,
    prePaymentRatio: String(config.prePaymentRatio),
    postConstructionPaymentDueDays: String(config.postConstructionPaymentDueDays),
    constructionDateNotice: buildConstructionDateNotice(input),
  });
}

function buildConstructionDateNotice(input: ComposeInput): string {
  if (input.paymentType !== "cash") return "";
  if (input.constructionDateStatus === "decided" && input.constructionDate) {
    return `現時点の工事予定日は${formatJpDate(input.constructionDate)}を予定しております。お支払い期限の詳細は別途ご案内いたします。`;
  }
  return "なお、工事予定日が確定次第、お支払い期限について改めてご案内いたします。";
}

function formatJpDate(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split("-");
  if (!y || !m || !d) return yyyyMmDd;
  return `${y}年${Number(m)}月${Number(d)}日`;
}

function buildNextTask(input: ComposeInput, config: TemplateConfig): NextTask {
  if (input.paymentType === "bank_loan") {
    return {
      type: "bank_follow_up",
      dueDate: addDays(input.contractDate, config.bankFollowUpDays),
      reason: `銀行審査結果の確認 (契約日 + ${config.bankFollowUpDays}日)`,
    };
  }

  if (input.constructionDateStatus === "decided" && input.constructionDate) {
    return {
      type: "pre_construction_payment_check",
      dueDate: addDays(input.constructionDate, -7),
      reason: "工事予定日の1週間前までに半金入金確認",
    };
  }

  return {
    type: "set_payment_check_after_construction_date_decided",
    dueDate: null,
    reason: "工事日確定後に入金確認日を設定する",
  };
}
