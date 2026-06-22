import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { TemplateConfig } from "../types.ts";

const here = dirname(fileURLToPath(import.meta.url));
const templatesDir = join(here, "..", "templates");

const bankLoanBodyTemplate = readFileSync(join(templatesDir, "bankLoan.txt"), "utf8");
const cashBodyTemplate = readFileSync(join(templatesDir, "cash.txt"), "utf8");

export const defaultTemplateConfig: TemplateConfig = {
  documentReturnAddress:
    "〒463-0003 愛知県名古屋市中区錦1-16-25 三甲名古屋錦ビル5F\n（株）Fit Founder JEPA申請担当 宛",
  assistantTeamName: "アフターホームチーム",
  companyName: "（株）Fit Founder",
  subjectStyle: "recommended",
  subjectLegacy: "【{{customerName}}】",
  subjectRecommended: "【{{customerName}}様】ご契約のお礼と今後のお手続きについて",
  bankLoanBodyTemplate,
  cashBodyTemplate,
  bankFollowUpDays: 7,
  prePaymentRatio: 50,
  postConstructionPaymentDueDays: 3,
  senderSignatureTemplate: "（株）Fit Founder\n{{salesStaffName}}\nTEL: [TODO]\nMAIL: [TODO]",
};
