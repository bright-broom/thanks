import type { EmailStatus } from "../types.ts";

const TRANSITIONS: Record<EmailStatus, readonly EmailStatus[]> = {
  not_created: ["draft_generated", "error"],
  draft_generated: ["pending_review", "on_hold", "draft_generated"],
  pending_review: ["approved", "on_hold", "draft_generated"],
  approved: ["sent", "on_hold", "pending_review"],
  on_hold: ["draft_generated", "pending_review"],
  sent: [],
  error: ["not_created"],
};

export function canTransition(from: EmailStatus, to: EmailStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export class InvalidTransitionError extends Error {
  constructor(
    readonly from: EmailStatus,
    readonly to: EmailStatus,
  ) {
    super(`Invalid status transition: ${from} → ${to}`);
    this.name = "InvalidTransitionError";
  }
}

export function assertTransition(from: EmailStatus, to: EmailStatus): void {
  if (!canTransition(from, to)) {
    throw new InvalidTransitionError(from, to);
  }
}

export function allowedNextStates(from: EmailStatus): readonly EmailStatus[] {
  return TRANSITIONS[from];
}
