/**
 * JU PICKS — Settlement safe errors
 */

export type SettlementErrorCode =
  | "NOT_AUTHORIZED"
  | "ENTRY_NOT_FOUND"
  | "ENTRY_NOT_READY"
  | "INVALID_SETTLEMENT_INPUT"
  | "RESULT_NOT_FINAL"
  | "CONTEST_CONFIG_MISSING"
  | "SETTLEMENT_ALREADY_APPLIED"
  | "SETTLEMENT_CONFLICT"
  | "REAL_MONEY_DISABLED"
  | "PROVIDER_UNAVAILABLE"
  | "INTERNAL";

export class SettlementError extends Error {
  constructor(
    public readonly code: SettlementErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "SettlementError";
  }
}

export const SETTLEMENT_SAFE_MESSAGES: Record<SettlementErrorCode, string> = {
  NOT_AUTHORIZED: "Not authorized",
  ENTRY_NOT_FOUND: "Entry not found",
  ENTRY_NOT_READY: "Entry is not ready for settlement",
  INVALID_SETTLEMENT_INPUT: "Invalid settlement input",
  RESULT_NOT_FINAL: "Results are not final",
  CONTEST_CONFIG_MISSING: "Contest configuration unavailable",
  SETTLEMENT_ALREADY_APPLIED: "Settlement already applied",
  SETTLEMENT_CONFLICT: "Settlement conflict",
  REAL_MONEY_DISABLED: "Real money is disabled",
  PROVIDER_UNAVAILABLE: "Results provider unavailable",
  INTERNAL: "Something went wrong",
};

export function mapSettlementError(err: unknown): SettlementError {
  if (err instanceof SettlementError) return err;
  const msg = err instanceof Error ? err.message : String(err);
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code: unknown }).code)
      : "";
  const combined = code + " " + msg;
  if (/NOT_AUTHORIZED|not_authorized|permission/i.test(combined))
    return new SettlementError("NOT_AUTHORIZED");
  if (/ENTRY_NOT_FOUND|not_found|no rows/i.test(combined))
    return new SettlementError("ENTRY_NOT_FOUND");
  if (/ENTRY_NOT_READY|not_ready/i.test(combined))
    return new SettlementError("ENTRY_NOT_READY");
  if (/RESULT_NOT_FINAL|not_final/i.test(combined))
    return new SettlementError("RESULT_NOT_FINAL");
  if (/CONTEST_CONFIG|config_missing/i.test(combined))
    return new SettlementError("CONTEST_CONFIG_MISSING");
  if (/ALREADY_APPLIED|already_settled|duplicate/i.test(combined))
    return new SettlementError("SETTLEMENT_ALREADY_APPLIED");
  if (/CONFLICT|version/i.test(combined))
    return new SettlementError("SETTLEMENT_CONFLICT");
  if (/REAL_MONEY|real_money|cash/i.test(combined))
    return new SettlementError("REAL_MONEY_DISABLED");
  if (/PROVIDER|unavailable/i.test(combined))
    return new SettlementError("PROVIDER_UNAVAILABLE");
  if (/INVALID|validation/i.test(combined))
    return new SettlementError("INVALID_SETTLEMENT_INPUT");
  return new SettlementError("INTERNAL");
}
