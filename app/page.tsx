"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type PaymentType = "bank_loan" | "cash";
type ConstructionDateStatus = "decided" | "undecided";
type Severity = "low" | "medium" | "high" | "critical";

type GenerateResponse = {
  templateType: PaymentType;
  subject: string;
  body: string;
  nextTask: { type: string; dueDate: string | null; reason: string };
  riskFlags: { code: string; severity: Severity; message: string }[];
};

type FormState = {
  customerName: string;
  paymentType: PaymentType | "";
  contractDate: string;
  salesStaffName: string;
  assistantStaffName: string;
  ccStaffName: string;
  customerEmail: string;
  constructionDateStatus: ConstructionDateStatus;
  constructionDate: string;
};

const SEVERITY_STYLES: Record<Severity, string> = {
  critical: "bg-red-100 text-red-900 border-red-400",
  high: "bg-orange-100 text-orange-900 border-orange-400",
  medium: "bg-amber-100 text-amber-900 border-amber-400",
  low: "bg-slate-100 text-slate-700 border-slate-300",
};

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "重大",
  high: "高",
  medium: "中",
  low: "低",
};

function todayLocalIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function Page() {
  const [form, setForm] = useState<FormState>({
    customerName: "",
    paymentType: "",
    contractDate: todayLocalIso(),
    salesStaffName: "",
    assistantStaffName: "",
    ccStaffName: "",
    customerEmail: "",
    constructionDateStatus: "undecided",
    constructionDate: "",
  });
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editedBody, setEditedBody] = useState<string | null>(null);
  const [copyHint, setCopyHint] = useState<string | null>(null);

  const canGenerate = useMemo(() => {
    return (
      form.customerName.trim() &&
      form.paymentType &&
      form.contractDate &&
      form.salesStaffName.trim() &&
      form.assistantStaffName.trim()
    );
  }, [form]);

  const templateLabel = useMemo(() => {
    if (form.paymentType === "bank_loan") return "銀行借入版 39 メール";
    if (form.paymentType === "cash") return "現金支払い版 39 メール";
    return "未選択 — 支払い方法を選んでください";
  }, [form.paymentType]);

  async function handleGenerate() {
    if (!canGenerate || !form.paymentType) return;
    setIsGenerating(true);
    setError(null);
    setCopyHint(null);
    try {
      const payload: Record<string, unknown> = {
        customerName: form.customerName.trim(),
        paymentType: form.paymentType,
        contractDate: form.contractDate,
        salesStaffName: form.salesStaffName.trim(),
        assistantStaffName: form.assistantStaffName.trim(),
        ccStaffName: form.ccStaffName.trim(),
      };
      if (form.customerEmail.trim()) payload.customerEmail = form.customerEmail.trim();
      if (form.paymentType === "cash") {
        payload.constructionDateStatus = form.constructionDateStatus;
        if (form.constructionDateStatus === "decided" && form.constructionDate) {
          payload.constructionDate = form.constructionDate;
        }
      }
      const res = await fetch("/api/thank-you-email/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        setError(`生成に失敗しました: ${JSON.stringify(errJson)}`);
        setResult(null);
        return;
      }
      const data: GenerateResponse = await res.json();
      setResult(data);
      setEditedBody(null);
    } catch (e) {
      setError(`通信エラー: ${(e as Error).message}`);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCopy() {
    if (!result) return;
    const body = editedBody ?? result.body;
    const text = `件名: ${result.subject}\n\n${body}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopyHint("コピーしました (件名 + 本文)");
      setTimeout(() => setCopyHint(null), 2000);
    } catch {
      setCopyHint("コピーに失敗しました");
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">契約後 39 メール生成</h1>
        <p className="mt-1 text-sm text-slate-600">
          Human in the Loop 型 — 入力 → テンプレート分岐 → リスクチェック → 人間確認 → コピー送信
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <FormPanel
          form={form}
          onChange={setForm}
          templateLabel={templateLabel}
          canGenerate={Boolean(canGenerate)}
          isGenerating={isGenerating}
          onGenerate={handleGenerate}
        />
        <ResultPanel
          result={result}
          error={error}
          editedBody={editedBody}
          onEditBody={setEditedBody}
          onCopy={handleCopy}
          copyHint={copyHint}
        />
      </div>
    </main>
  );
}

function FormPanel(props: {
  form: FormState;
  onChange: (f: FormState) => void;
  templateLabel: string;
  canGenerate: boolean;
  isGenerating: boolean;
  onGenerate: () => void;
}) {
  const { form, onChange, templateLabel, canGenerate, isGenerating, onGenerate } = props;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    onChange({ ...form, [key]: value });
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-slate-900">案件情報</h2>

      <div className="space-y-4">
        <Field label="顧客名" required>
          <input
            type="text"
            value={form.customerName}
            onChange={(e) => set("customerName", e.target.value)}
            className="input"
            placeholder="山田 太郎"
          />
        </Field>

        <Field label="契約日" required>
          <input
            type="date"
            value={form.contractDate}
            onChange={(e) => set("contractDate", e.target.value)}
            className="input"
          />
        </Field>

        <Field label="支払い方法" required>
          <div className="flex gap-3">
            <RadioPill
              checked={form.paymentType === "bank_loan"}
              onChange={() => set("paymentType", "bank_loan")}
              label="銀行借入"
            />
            <RadioPill
              checked={form.paymentType === "cash"}
              onChange={() => set("paymentType", "cash")}
              label="現金支払い"
            />
          </div>
        </Field>

        {form.paymentType === "cash" && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <Field label="工事予定日">
              <label className="mb-2 flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={form.constructionDateStatus === "undecided"}
                  onChange={(e) =>
                    set(
                      "constructionDateStatus",
                      e.target.checked ? "undecided" : "decided",
                    )
                  }
                />
                工事予定日は未定
              </label>
              <input
                type="date"
                value={form.constructionDate}
                onChange={(e) => set("constructionDate", e.target.value)}
                disabled={form.constructionDateStatus === "undecided"}
                className="input disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </Field>
          </div>
        )}

        <Field label="担当者名" required>
          <input
            type="text"
            value={form.salesStaffName}
            onChange={(e) => set("salesStaffName", e.target.value)}
            className="input"
            placeholder="佐藤 健一"
          />
        </Field>

        <Field label="アシスタント名" required>
          <input
            type="text"
            value={form.assistantStaffName}
            onChange={(e) => set("assistantStaffName", e.target.value)}
            className="input"
            placeholder="鈴木 花子"
          />
        </Field>

        <Field label="CC 担当者">
          <input
            type="text"
            value={form.ccStaffName}
            onChange={(e) => set("ccStaffName", e.target.value)}
            className="input"
            placeholder="高橋 一郎"
          />
        </Field>

        <Field label="顧客メールアドレス">
          <input
            type="email"
            value={form.customerEmail}
            onChange={(e) => set("customerEmail", e.target.value)}
            className="input"
            placeholder="customer@example.com"
          />
        </Field>
      </div>

      <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
        <div className="text-xs font-semibold text-blue-700">選択中テンプレート</div>
        <div className="mt-1 text-blue-900">{templateLabel}</div>
      </div>

      <button
        onClick={onGenerate}
        disabled={!canGenerate || isGenerating}
        className="mt-5 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {isGenerating ? "生成中…" : "39 メール生成"}
      </button>

    </section>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </label>
      {children}
    </div>
  );
}

function RadioPill({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
        checked
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-300 bg-white text-slate-700 hover:border-slate-500"
      }`}
    >
      {label}
    </button>
  );
}

function ResultPanel(props: {
  result: GenerateResponse | null;
  error: string | null;
  editedBody: string | null;
  onEditBody: (v: string | null) => void;
  onCopy: () => void;
  copyHint: string | null;
}) {
  const { result, error, editedBody, onEditBody, onCopy, copyHint } = props;
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (result) {
      setIsEditing(false);
      onEditBody(null);
    }
  }, [result]);

  if (error) {
    return (
      <section className="rounded-xl border border-red-300 bg-red-50 p-5 text-red-900">
        <h2 className="text-base font-semibold">エラー</h2>
        <pre className="mt-2 whitespace-pre-wrap text-sm">{error}</pre>
      </section>
    );
  }

  if (!result) {
    return (
      <section className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500">
        左フォームを埋めて「39 メール生成」を押すと、生成結果がここに表示されます。
      </section>
    );
  }

  const displayBody = editedBody ?? result.body;
  const criticalFlags = result.riskFlags.filter((f) => f.severity === "critical");

  return (
    <section className="space-y-4">
      {result.riskFlags.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">
            リスクチェック ({result.riskFlags.length})
            {criticalFlags.length > 0 && (
              <span className="ml-2 inline-block rounded bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
                重大 {criticalFlags.length} 件
              </span>
            )}
          </h3>
          <ul className="space-y-2">
            {result.riskFlags.map((f, i) => (
              <li
                key={i}
                className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${SEVERITY_STYLES[f.severity]}`}
              >
                <span className="shrink-0 rounded bg-white/70 px-1.5 py-0.5 text-xs font-bold">
                  {SEVERITY_LABEL[f.severity]}
                </span>
                <span className="flex-1">{f.message}</span>
                <code className="shrink-0 text-xs opacity-60">{f.code}</code>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">件名</h3>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900">
          {result.subject}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">本文</h3>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (isEditing) {
                  setIsEditing(false);
                } else {
                  setIsEditing(true);
                  if (editedBody === null) onEditBody(result.body);
                  setTimeout(() => textareaRef.current?.focus(), 50);
                }
              }}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-500"
            >
              {isEditing ? "編集を確定" : "編集"}
            </button>
            <button
              onClick={onCopy}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              コピー (件名 + 本文)
            </button>
          </div>
        </div>
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={editedBody ?? result.body}
            onChange={(e) => onEditBody(e.target.value)}
            className="h-[480px] w-full rounded-lg border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900"
          />
        ) : (
          <pre className="max-h-[480px] overflow-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900">
            {displayBody}
          </pre>
        )}
        {copyHint && (
          <div className="mt-2 text-xs text-emerald-700">{copyHint}</div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold text-slate-900">次回タスク</h3>
        <div className="text-sm">
          <div>
            <span className="text-slate-600">種別: </span>
            <code className="text-slate-900">{result.nextTask.type}</code>
          </div>
          <div>
            <span className="text-slate-600">期限: </span>
            <span className="text-slate-900">
              {result.nextTask.dueDate ?? "未定 (工事日確定後に設定)"}
            </span>
          </div>
          <div>
            <span className="text-slate-600">理由: </span>
            <span className="text-slate-900">{result.nextTask.reason}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
