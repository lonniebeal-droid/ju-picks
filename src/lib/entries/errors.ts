/**
 * JU PICKS — Entry domain safe errors
 */

export type EntryErrorCode =
  | "NOT_AUTHORIZED"
  | "INVALID_ENTRY"
  | "INSUFFICIENT_CREDITS"
  | "DUPLICATE_PICK"
  | "PROJECTION_LOCKED"
  | "PROJECTION_NOT_FOUND"
  | "ENTRY_NOT_FOUND"
  | "ENTRY_NOT_CANCELLABLE"
  | "DUPLICATE_SUBMISSION"
  | "REAL_MONEY_DISABLED"
  | "SELF_EXCLUDED"
  | "INTERNAL";

export class EntryError extends Error {
  constructor(
    public readonly code: EntryErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "EntryError";
  }
}

export const ENTRY_SAFE_MESSAGES: Record<EntryErrorCode, string> = {
  NOT_AUTHORIZED: "Not authorized",
  INVALID_ENTRY: "Invalid entry",
  INSUFFICIENT_CREDITS: "Insufficient credits",
  DUPLICATE_PICK: "Duplicate picks are not allowed",
  PROJECTION_LOCKED: "Projection is locked",
  PROJECTION_NOT_FOUND: "Projection not found",
  ENTRY_NOT_FOUND: "Entry not found",
  ENTRY_NOT_CANCELLABLE: "Entry cannot be cancelled",
  DUPLICATE_SUBMISSION: "Entry already submitted",
  REAL_MONEY_DISABLED: "Real money is disabled",
  SELF_EXCLUDED: "Action unavailable",
  INTERNAL: "Something went wrong",
};

export function mapEntryError(err: unknown): EntryError {
  if (err instanceof EntryError) return err;
  const msg = err instanceof Error ? err.message : String(err);
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code: unknown }).code)
      : "";
  const c = code + " " + msg;
  if (/NOT_AUTHORIZED|not_authorized|permission/i.test(c))
    return new EntryError("NOT_AUTHORIZED");
  if (/INSUFFICIENT/i.test(c)) return new EntryError("INSUFFICIENT_CREDITS");
  if (/DUPLICATE_PICK|duplicate.?pick/i.test(c))
    return new EntryError("DUPLICATE_PICK");
  if (/PROJECTION_LOCKED|projection_locked/i.test(c))
    return new EntryError("PROJECTION_LOCKED");
  if (/PROJECTION_CLOSED|PROJECTION_NOT_FOUND/i.test(c))
    return new EntryError("PROJECTION_NOT_FOUND");
  if (/DUPLICATE_ENTRY|DUPLICATE_SUBMISSION|idempotency/i.test(c))
    return new EntryError("DUPLICATE_SUBMISSION");
  if (/ENTRY_LOCKED|ENTRY_NOT_CANCELLABLE|entry_locked/i.test(c))
    return new EntryError("ENTRY_NOT_CANCELLABLE");
  if (/SELF_EXCLUDED/i.test(c)) return new EntryError("SELF_EXCLUDED");
  if (/REAL_MONEY|real_money|cash/i.test(c))
    return new EntryError("REAL_MONEY_DISABLED");
  if (/INVALID_ENTRY|invalid.?entry/i.test(c))
    return new EntryError("INVALID_ENTRY");
  if (/NOT_FOUND|not found/i.test(c)) return new EntryError("ENTRY_NOT_FOUND");
  return new EntryError("INTERNAL");
}
