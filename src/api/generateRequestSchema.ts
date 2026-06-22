import { z } from "zod";

export const generateRequestSchema = z
  .object({
    customerName: z.string().min(1, "顧客名は必須です"),
    paymentType: z.enum(["bank_loan", "cash"]),
    contractDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "契約日は YYYY-MM-DD 形式で入力してください"),
    salesStaffName: z.string().min(1, "担当者名は必須です"),
    assistantStaffName: z.string().min(1, "アシスタント名は必須です"),
    ccStaffName: z.string().default(""),
    customerEmail: z.string().optional(),
    constructionDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    constructionDateStatus: z.enum(["decided", "undecided"]).optional(),
    bankProcessStatus: z
      .enum(["already_started", "not_started_yet", "unknown"])
      .optional(),
  })
  .refine(
    (v) => {
      if (v.paymentType !== "cash") return true;
      if (v.constructionDateStatus === "decided") return Boolean(v.constructionDate);
      return true;
    },
    {
      message: "工事予定日が「確定」の場合は具体的な日付が必須です",
      path: ["constructionDate"],
    },
  );

export type GenerateRequest = z.infer<typeof generateRequestSchema>;
