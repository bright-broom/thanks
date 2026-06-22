export type PaymentType = "bank_loan" | "cash";

export type ConstructionDateStatus = "decided" | "undecided";

export type BankProcessStatus = "already_started" | "not_started_yet" | "unknown";

export type SubjectStyle = "legacy" | "recommended";

export type EmailStatus =
  | "not_created"
  | "draft_generated"
  | "pending_review"
  | "approved"
  | "sent"
  | "on_hold"
  | "error";

export type NextTaskType =
  | "bank_follow_up"
  | "pre_construction_payment_check"
  | "set_payment_check_after_construction_date_decided"
  | "none";

export type RiskFlagCode =
  | "MISSING_CUSTOMER_NAME"
  | "MISSING_PAYMENT_TYPE"
  | "MISSING_STAFF_NAME"
  | "MISSING_SIGNATURE"
  | "MISSING_CC_STAFF"
  | "MISSING_CONSTRUCTION_DATE_FOR_CASH"
  | "PAYMENT_TEMPLATE_MISMATCH"
  | "BANK_SECTION_INCLUDED_FOR_CASH"
  | "CASH_SECTION_INCLUDED_FOR_BANK_LOAN"
  | "MISSING_REPLY_ALL_NOTICE"
  | "MISSING_POWER_OF_ATTORNEY_NOTICE"
  | "MISSING_RETURN_ADDRESS"
  | "PAST_CONTRACT_DATE"
  | "FUTURE_CONTRACT_DATE"
  | "CONTRACT_DATE_TOO_OLD"
  | "INVALID_CUSTOMER_EMAIL"
  | "MANUAL_REVIEW_REQUIRED";

export type Severity = "low" | "medium" | "high" | "critical";

export type EmailRiskFlag = {
  code: RiskFlagCode;
  severity: Severity;
  message: string;
};

export type ComposeInput = {
  customerName: string;
  paymentType: PaymentType;
  contractDate: string;
  salesStaffName: string;
  assistantStaffName: string;
  ccStaffName: string;
  customerEmail?: string;
  constructionDate?: string;
  constructionDateStatus?: ConstructionDateStatus;
  bankProcessStatus?: BankProcessStatus;
};

export type TemplateConfig = {
  documentReturnAddress: string;
  assistantTeamName: string;
  companyName: string;
  subjectStyle: SubjectStyle;
  subjectLegacy: string;
  subjectRecommended: string;
  bankLoanBodyTemplate: string;
  cashBodyTemplate: string;
  bankFollowUpDays: number;
  prePaymentRatio: number;
  postConstructionPaymentDueDays: number;
  senderSignatureTemplate: string;
};

export type NextTask = {
  type: NextTaskType;
  dueDate: string | null;
  reason: string;
};

export type DraftEmail = {
  templateType: PaymentType;
  subject: string;
  body: string;
  nextTask: NextTask;
};

export type ComposeResult = {
  draft: DraftEmail;
  riskFlags: EmailRiskFlag[];
};

export type ThankYouEmail = {
  id: string;
  status: EmailStatus;
  input: ComposeInput;
  draft: DraftEmail;
  bodyOverride?: string;
  riskFlags: EmailRiskFlag[];
  sentAt?: string;
  sentBy?: string;
  actualTo?: string;
  actualCc?: string[];
  createdAt: string;
  updatedAt: string;
};

export type AuditAction =
  | "generate"
  | "regenerate"
  | "edit_body"
  | "transition"
  | "risk_check"
  | "copy"
  | "mark_sent"
  | "hold"
  | "resume";

export type AuditLogEntry = {
  id: string;
  emailId: string;
  action: AuditAction;
  at: string;
  actor: string;
  fromStatus?: EmailStatus;
  toStatus?: EmailStatus;
  riskFlagCount?: number;
  note?: string;
};
