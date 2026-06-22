import { describe, expect, it } from "vitest";
import {
  allowedNextStates,
  assertTransition,
  canTransition,
  InvalidTransitionError,
} from "../stateMachine.ts";

describe("stateMachine", () => {
  it("正常なハッピーパス遷移を許可する", () => {
    expect(canTransition("not_created", "draft_generated")).toBe(true);
    expect(canTransition("draft_generated", "pending_review")).toBe(true);
    expect(canTransition("pending_review", "approved")).toBe(true);
    expect(canTransition("approved", "sent")).toBe(true);
  });

  it("sent からはどこにも遷移できない", () => {
    expect(allowedNextStates("sent")).toEqual([]);
  });

  it("不正な遷移を拒否する", () => {
    expect(canTransition("not_created", "sent")).toBe(false);
    expect(canTransition("draft_generated", "sent")).toBe(false);
    expect(canTransition("sent", "approved")).toBe(false);
  });

  it("on_hold への遷移は draft_generated / pending_review / approved から可能", () => {
    expect(canTransition("draft_generated", "on_hold")).toBe(true);
    expect(canTransition("pending_review", "on_hold")).toBe(true);
    expect(canTransition("approved", "on_hold")).toBe(true);
  });

  it("on_hold から draft_generated / pending_review に戻せる", () => {
    expect(canTransition("on_hold", "draft_generated")).toBe(true);
    expect(canTransition("on_hold", "pending_review")).toBe(true);
  });

  it("approved → pending_review (差し戻し) が可能", () => {
    expect(canTransition("approved", "pending_review")).toBe(true);
  });

  it("assertTransition は不正遷移で例外を投げる", () => {
    expect(() => assertTransition("sent", "approved")).toThrow(InvalidTransitionError);
  });

  it("draft_generated 中の再生成は許可 (draft_generated → draft_generated)", () => {
    expect(canTransition("draft_generated", "draft_generated")).toBe(true);
  });
});
