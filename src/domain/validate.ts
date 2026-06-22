import type {
  ComposeInput,
  DraftEmail,
  EmailRiskFlag,
  TemplateConfig,
} from "../types.ts";
import { diffInDays, isValidDateString } from "./date.ts";

const REQUIRED_PHRASES: { phrase: string; code: EmailRiskFlag["code"]; severity: EmailRiskFlag["severity"]; message: string }[] = [
  {
    phrase: "契約内容のご確認",
    code: "MANUAL_REVIEW_REQUIRED",
    severity: "high",
    message: "契約内容確認電話の案内文が見当たりません",
  },
  {
    phrase: "委任状",
    code: "MISSING_POWER_OF_ATTORNEY_NOTICE",
    severity: "critical",
    message: "委任状の案内が本文にありません",
  },
  {
    phrase: "印鑑証明書",
    code: "MISSING_POWER_OF_ATTORNEY_NOTICE",
    severity: "high",
    message: "印鑑証明書の同封依頼が本文にありません",
  },
  {
    phrase: "全員に返信",
    code: "MISSING_REPLY_ALL_NOTICE",
    severity: "high",
    message: "全員返信のお願いが本文にありません",
  },
];

const BANK_SECTION_MARKER = "銀行審査";
const CASH_SECTION_MARKER = "現金でのお支払い";

export type ValidateContext = {
  today: string;
};

export function validate(
  input: ComposeInput,
  draft: DraftEmail,
  config: TemplateConfig,
  ctx: ValidateContext,
): EmailRiskFlag[] {
  const flags: EmailRiskFlag[] = [];

  pushRequiredInputs(input, flags);
  pushDateChecks(input, ctx, flags);
  pushEmailFormatCheck(input, flags);
  pushTemplateIntegrity(input, draft, flags);
  pushRequiredPhrases(draft, flags);
  pushReturnAddressCheck(draft, config, flags);

  return flags;
}

function pushRequiredInputs(input: ComposeInput, flags: EmailRiskFlag[]): void {
  if (!input.customerName.trim()) {
    flags.push({
      code: "MISSING_CUSTOMER_NAME",
      severity: "critical",
      message: "顧客名が未入力です",
    });
  }
  if (!input.salesStaffName.trim() || !input.assistantStaffName.trim()) {
    flags.push({
      code: "MISSING_STAFF_NAME",
      severity: "high",
      message: "担当者またはアシスタント名が未入力です",
    });
  }
  if (input.paymentType === "cash") {
    if (
      input.constructionDateStatus === "decided" &&
      (!input.constructionDate || !isValidDateString(input.constructionDate))
    ) {
      flags.push({
        code: "MISSING_CONSTRUCTION_DATE_FOR_CASH",
        severity: "high",
        message: "工事予定日が「確定」なのに具体的な日付がありません",
      });
    }
  }
}

function pushDateChecks(
  input: ComposeInput,
  ctx: ValidateContext,
  flags: EmailRiskFlag[],
): void {
  if (!isValidDateString(input.contractDate)) {
    flags.push({
      code: "FUTURE_CONTRACT_DATE",
      severity: "high",
      message: `契約日の形式が不正です: ${input.contractDate}`,
    });
    return;
  }
  const delta = diffInDays(input.contractDate, ctx.today);
  if (delta < 0) {
    flags.push({
      code: "FUTURE_CONTRACT_DATE",
      severity: "medium",
      message: "契約日が未来日になっています",
    });
  } else if (delta >= 2) {
    flags.push({
      code: "CONTRACT_DATE_TOO_OLD",
      severity: "medium",
      message: `契約日から${delta}日経過しています。送信が遅れている可能性があります`,
    });
  }

  if (
    input.paymentType === "cash" &&
    input.constructionDate &&
    isValidDateString(input.constructionDate) &&
    diffInDays(ctx.today, input.constructionDate) < 0
  ) {
    flags.push({
      code: "PAST_CONTRACT_DATE",
      severity: "high",
      message: "工事予定日が過去日になっています",
    });
  }
}

function pushEmailFormatCheck(input: ComposeInput, flags: EmailRiskFlag[]): void {
  const email = input.customerEmail;
  if (!email) return;
  if (email !== email.trim()) {
    flags.push({
      code: "INVALID_CUSTOMER_EMAIL",
      severity: "medium",
      message: "顧客メールアドレスの前後に空白があります",
    });
  }
  if (/[^ -~]/.test(email)) {
    flags.push({
      code: "INVALID_CUSTOMER_EMAIL",
      severity: "high",
      message: "顧客メールアドレスに全角文字が含まれています",
    });
  }
  if (!email.includes("@")) {
    flags.push({
      code: "INVALID_CUSTOMER_EMAIL",
      severity: "critical",
      message: "顧客メールアドレスに @ が含まれていません",
    });
  }
}

function pushTemplateIntegrity(
  input: ComposeInput,
  draft: DraftEmail,
  flags: EmailRiskFlag[],
): void {
  if (input.paymentType !== draft.templateType) {
    flags.push({
      code: "PAYMENT_TEMPLATE_MISMATCH",
      severity: "critical",
      message: `支払い方法 (${input.paymentType}) とテンプレート (${draft.templateType}) が不一致`,
    });
  }
  if (draft.templateType === "bank_loan" && draft.body.includes(CASH_SECTION_MARKER)) {
    flags.push({
      code: "CASH_SECTION_INCLUDED_FOR_BANK_LOAN",
      severity: "critical",
      message: "銀行借入版に現金支払いの文面が混入しています",
    });
  }
  if (draft.templateType === "cash" && draft.body.includes(BANK_SECTION_MARKER)) {
    flags.push({
      code: "BANK_SECTION_INCLUDED_FOR_CASH",
      severity: "critical",
      message: "現金支払い版に銀行審査の文面が混入しています",
    });
  }
  if (draft.templateType === "bank_loan" && !draft.body.includes(BANK_SECTION_MARKER)) {
    flags.push({
      code: "PAYMENT_TEMPLATE_MISMATCH",
      severity: "critical",
      message: "銀行借入版に銀行審査セクションが含まれていません",
    });
  }
  if (draft.templateType === "cash" && !draft.body.includes(CASH_SECTION_MARKER)) {
    flags.push({
      code: "PAYMENT_TEMPLATE_MISMATCH",
      severity: "critical",
      message: "現金支払い版に現金支払いセクションが含まれていません",
    });
  }
}

function pushRequiredPhrases(draft: DraftEmail, flags: EmailRiskFlag[]): void {
  for (const r of REQUIRED_PHRASES) {
    if (!draft.body.includes(r.phrase)) {
      flags.push({ code: r.code, severity: r.severity, message: r.message });
    }
  }
}

function pushReturnAddressCheck(
  draft: DraftEmail,
  config: TemplateConfig,
  flags: EmailRiskFlag[],
): void {
  const addressFirstLine = config.documentReturnAddress.split("\n")[0]?.trim() ?? "";
  if (!addressFirstLine) return;
  if (!draft.body.includes(addressFirstLine)) {
    flags.push({
      code: "MISSING_RETURN_ADDRESS",
      severity: "critical",
      message: "書類送付先が本文に含まれていません",
    });
  }
}
