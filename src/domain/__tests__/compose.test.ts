import { describe, expect, it } from "vitest";
import { compose } from "../compose.ts";
import { validate } from "../validate.ts";
import { defaultTemplateConfig } from "../../config/templateConfig.ts";
import type { ComposeInput } from "../../types.ts";

const TODAY = "2026-06-22";

function bankLoanInput(): ComposeInput {
  return {
    customerName: "山田 太郎",
    paymentType: "bank_loan",
    contractDate: "2026-06-22",
    salesStaffName: "佐藤 健一",
    assistantStaffName: "鈴木 花子",
    ccStaffName: "高橋 一郎",
    customerEmail: "yamada@example.com",
    bankProcessStatus: "not_started_yet",
  };
}

function cashInputDecided(): ComposeInput {
  return {
    customerName: "田中 次郎",
    paymentType: "cash",
    contractDate: "2026-06-22",
    salesStaffName: "佐藤 健一",
    assistantStaffName: "鈴木 花子",
    ccStaffName: "高橋 一郎",
    constructionDate: "2026-08-01",
    constructionDateStatus: "decided",
  };
}

function cashInputUndecided(): ComposeInput {
  const { constructionDate: _omit, ...rest } = cashInputDecided();
  return {
    ...rest,
    customerName: "佐々木 三郎",
    constructionDateStatus: "undecided",
  };
}

describe("compose - bank_loan", () => {
  it("生成された本文を確認のためダンプ", () => {
    const result = compose(bankLoanInput(), defaultTemplateConfig);
    console.log("\n===== 銀行借入版 件名 =====\n" + result.subject);
    console.log("\n===== 銀行借入版 本文 =====\n" + result.body);
    console.log("\n===== 次回タスク =====\n" + JSON.stringify(result.nextTask, null, 2));
    expect(result.templateType).toBe("bank_loan");
  });

  it("件名に顧客名と推奨フレーズが入る", () => {
    const result = compose(bankLoanInput(), defaultTemplateConfig);
    expect(result.subject).toContain("山田 太郎");
    expect(result.subject).toContain("ご契約のお礼と今後のお手続きについて");
  });

  it("銀行審査セクションが入り、現金支払いセクションが入らない", () => {
    const result = compose(bankLoanInput(), defaultTemplateConfig);
    expect(result.body).toContain("銀行審査");
    expect(result.body).not.toContain("現金でのお支払い");
  });

  it("nextTask は契約日 + 7 日", () => {
    const result = compose(bankLoanInput(), defaultTemplateConfig);
    expect(result.nextTask.type).toBe("bank_follow_up");
    expect(result.nextTask.dueDate).toBe("2026-06-29");
  });
});

describe("compose - cash (工事日確定)", () => {
  it("生成された本文を確認のためダンプ", () => {
    const result = compose(cashInputDecided(), defaultTemplateConfig);
    console.log("\n===== 現金版(工事日確定) 件名 =====\n" + result.subject);
    console.log("\n===== 現金版(工事日確定) 本文 =====\n" + result.body);
    console.log("\n===== 次回タスク =====\n" + JSON.stringify(result.nextTask, null, 2));
    expect(result.templateType).toBe("cash");
  });

  it("現金支払いセクションが入り、銀行審査セクションが入らない", () => {
    const result = compose(cashInputDecided(), defaultTemplateConfig);
    expect(result.body).toContain("現金でのお支払い");
    expect(result.body).not.toContain("銀行審査");
  });

  it("工事予定日が本文に表示される", () => {
    const result = compose(cashInputDecided(), defaultTemplateConfig);
    expect(result.body).toContain("2026年8月1日");
  });

  it("nextTask は工事日 - 7 日", () => {
    const result = compose(cashInputDecided(), defaultTemplateConfig);
    expect(result.nextTask.type).toBe("pre_construction_payment_check");
    expect(result.nextTask.dueDate).toBe("2026-07-25");
  });
});

describe("compose - cash (工事日未定)", () => {
  it("生成された本文を確認のためダンプ", () => {
    const result = compose(cashInputUndecided(), defaultTemplateConfig);
    console.log("\n===== 現金版(工事日未定) 件名 =====\n" + result.subject);
    console.log("\n===== 現金版(工事日未定) 本文 =====\n" + result.body);
    console.log("\n===== 次回タスク =====\n" + JSON.stringify(result.nextTask, null, 2));
  });

  it("「確定次第ご案内」の文言が入る", () => {
    const result = compose(cashInputUndecided(), defaultTemplateConfig);
    expect(result.body).toContain("確定次第");
  });

  it("nextTask は set_payment_check_after_construction_date_decided", () => {
    const result = compose(cashInputUndecided(), defaultTemplateConfig);
    expect(result.nextTask.type).toBe("set_payment_check_after_construction_date_decided");
    expect(result.nextTask.dueDate).toBeNull();
  });
});

describe("validate", () => {
  it("正常系: 銀行借入で重大フラグなし", () => {
    const result = compose(bankLoanInput(), defaultTemplateConfig);
    const flags = validate(bankLoanInput(), result, defaultTemplateConfig, { today: TODAY });
    const critical = flags.filter((f) => f.severity === "critical");
    expect(critical).toEqual([]);
  });

  it("正常系: 現金支払いで重大フラグなし", () => {
    const result = compose(cashInputDecided(), defaultTemplateConfig);
    const flags = validate(cashInputDecided(), result, defaultTemplateConfig, { today: TODAY });
    const critical = flags.filter((f) => f.severity === "critical");
    expect(critical).toEqual([]);
  });

  it("顧客名空でフラグ", () => {
    const input = { ...bankLoanInput(), customerName: "" };
    const result = compose({ ...input, customerName: "_" }, defaultTemplateConfig);
    const flags = validate(input, result, defaultTemplateConfig, { today: TODAY });
    expect(flags.some((f) => f.code === "MISSING_CUSTOMER_NAME")).toBe(true);
  });

  it("契約日が3日前なら警告", () => {
    const input = { ...bankLoanInput(), contractDate: "2026-06-19" };
    const result = compose(input, defaultTemplateConfig);
    const flags = validate(input, result, defaultTemplateConfig, { today: TODAY });
    expect(flags.some((f) => f.code === "CONTRACT_DATE_TOO_OLD")).toBe(true);
  });

  it("契約日が未来日なら警告", () => {
    const input = { ...bankLoanInput(), contractDate: "2026-06-25" };
    const result = compose(input, defaultTemplateConfig);
    const flags = validate(input, result, defaultTemplateConfig, { today: TODAY });
    expect(flags.some((f) => f.code === "FUTURE_CONTRACT_DATE")).toBe(true);
  });

  it("顧客メールに全角文字があれば警告", () => {
    const input = { ...bankLoanInput(), customerEmail: "yamada＠example.com" };
    const result = compose(input, defaultTemplateConfig);
    const flags = validate(input, result, defaultTemplateConfig, { today: TODAY });
    expect(flags.some((f) => f.code === "INVALID_CUSTOMER_EMAIL")).toBe(true);
  });

  it("paymentType と templateType の不一致でフラグ", () => {
    const input = bankLoanInput();
    const draft = compose(input, defaultTemplateConfig);
    const tampered = { ...draft, templateType: "cash" as const };
    const flags = validate(input, tampered, defaultTemplateConfig, { today: TODAY });
    expect(flags.some((f) => f.code === "PAYMENT_TEMPLATE_MISMATCH")).toBe(true);
  });
});
