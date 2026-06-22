// PoC stand-in for Supabase. Single JSON file on disk. Not concurrency-safe.
// Marked for swap-out in Phase 4 (Supabase persistence).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import type {
  AuditAction,
  AuditLogEntry,
  EmailStatus,
  ThankYouEmail,
} from "../types.ts";

type StoreShape = {
  emails: ThankYouEmail[];
  auditLog: AuditLogEntry[];
};

const DEFAULT_STORE_PATH = join(process.cwd(), ".local-store", "emails.json");

const EMPTY: StoreShape = { emails: [], auditLog: [] };

function load(path: string): StoreShape {
  if (!existsSync(path)) return { emails: [], auditLog: [] };
  try {
    const raw = readFileSync(path, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoreShape>;
    return {
      emails: parsed.emails ?? [],
      auditLog: parsed.auditLog ?? [],
    };
  } catch {
    return { ...EMPTY };
  }
}

function save(path: string, data: StoreShape): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export class EmailStore {
  private state: StoreShape;
  constructor(private readonly path: string = DEFAULT_STORE_PATH) {
    this.state = load(this.path);
  }

  private persist(): void {
    save(this.path, this.state);
  }

  private now(): string {
    return new Date().toISOString();
  }

  list(): ThankYouEmail[] {
    return [...this.state.emails].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
  }

  get(id: string): ThankYouEmail | undefined {
    return this.state.emails.find((e) => e.id === id);
  }

  insert(email: Omit<ThankYouEmail, "id" | "createdAt" | "updatedAt">): ThankYouEmail {
    const now = this.now();
    const created: ThankYouEmail = {
      ...email,
      id: `email_${randomUUID()}`,
      createdAt: now,
      updatedAt: now,
    };
    this.state.emails.push(created);
    this.persist();
    return created;
  }

  update(id: string, mut: (e: ThankYouEmail) => ThankYouEmail): ThankYouEmail {
    const idx = this.state.emails.findIndex((e) => e.id === id);
    if (idx < 0) throw new Error(`Email not found: ${id}`);
    const before = this.state.emails[idx]!;
    const next: ThankYouEmail = { ...mut(before), updatedAt: this.now() };
    this.state.emails[idx] = next;
    this.persist();
    return next;
  }

  appendAudit(entry: Omit<AuditLogEntry, "id" | "at">): AuditLogEntry {
    const created: AuditLogEntry = {
      ...entry,
      id: `audit_${randomUUID()}`,
      at: this.now(),
    };
    this.state.auditLog.push(created);
    this.persist();
    return created;
  }

  auditFor(emailId: string): AuditLogEntry[] {
    return this.state.auditLog.filter((a) => a.emailId === emailId);
  }
}

let singleton: EmailStore | undefined;

export function getEmailStore(): EmailStore {
  if (!singleton) singleton = new EmailStore();
  return singleton;
}

export type AuditDraft = {
  action: AuditAction;
  actor: string;
  fromStatus?: EmailStatus;
  toStatus?: EmailStatus;
  note?: string;
  riskFlagCount?: number;
};
