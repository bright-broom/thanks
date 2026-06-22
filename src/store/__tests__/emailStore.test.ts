import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EmailStore } from "../emailStore.ts";
import type { ComposeInput, DraftEmail } from "../../types.ts";

function makeFixture(): {
  input: ComposeInput;
  draft: DraftEmail;
} {
  const input: ComposeInput = {
    customerName: "山田 太郎",
    paymentType: "bank_loan",
    contractDate: "2026-06-22",
    salesStaffName: "佐藤 健一",
    assistantStaffName: "鈴木 花子",
    ccStaffName: "高橋 一郎",
  };
  const draft: DraftEmail = {
    templateType: "bank_loan",
    subject: "件名",
    body: "本文",
    nextTask: { type: "bank_follow_up", dueDate: "2026-06-29", reason: "" },
  };
  return { input, draft };
}

describe("EmailStore", () => {
  let dir: string;
  let store: EmailStore;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "thanks-store-"));
    store = new EmailStore(join(dir, "store.json"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("insert と get が動く", () => {
    const { input, draft } = makeFixture();
    const created = store.insert({
      status: "draft_generated",
      input,
      draft,
      riskFlags: [],
    });
    expect(created.id).toMatch(/^email_/);
    expect(store.get(created.id)?.status).toBe("draft_generated");
  });

  it("update でステータス変更でき updatedAt が進む", async () => {
    const { input, draft } = makeFixture();
    const created = store.insert({
      status: "draft_generated",
      input,
      draft,
      riskFlags: [],
    });
    await new Promise((r) => setTimeout(r, 5));
    const updated = store.update(created.id, (e) => ({ ...e, status: "approved" }));
    expect(updated.status).toBe("approved");
    expect(updated.updatedAt > created.updatedAt).toBe(true);
  });

  it("ファイルに永続化され、別インスタンスで読める", () => {
    const { input, draft } = makeFixture();
    const created = store.insert({
      status: "draft_generated",
      input,
      draft,
      riskFlags: [],
    });
    const reopened = new EmailStore(join(dir, "store.json"));
    expect(reopened.get(created.id)?.id).toBe(created.id);
  });

  it("audit log が追加され、emailId で抽出できる", () => {
    const { input, draft } = makeFixture();
    const e = store.insert({
      status: "draft_generated",
      input,
      draft,
      riskFlags: [],
    });
    store.appendAudit({ emailId: e.id, action: "generate", actor: "tester" });
    store.appendAudit({
      emailId: e.id,
      action: "transition",
      actor: "tester",
      fromStatus: "draft_generated",
      toStatus: "approved",
    });
    const audits = store.auditFor(e.id);
    expect(audits).toHaveLength(2);
    expect(audits[1]!.action).toBe("transition");
  });

  it("list は updatedAt 降順で返す", async () => {
    const { input, draft } = makeFixture();
    const a = store.insert({
      status: "draft_generated",
      input,
      draft,
      riskFlags: [],
    });
    await new Promise((r) => setTimeout(r, 5));
    const b = store.insert({
      status: "draft_generated",
      input,
      draft,
      riskFlags: [],
    });
    const list = store.list();
    expect(list[0]!.id).toBe(b.id);
    expect(list[1]!.id).toBe(a.id);
  });
});
