/**
 * JU PICKS — Wallet domain safe errors
 */

export type WalletErrorCode =
  | "NOT_AUTHORIZED"
  | "NOT_FOUND"
  | "INSUFFICIENT_CREDITS"
  | "REAL_MONEY_DISABLED"
  | "DUPLICATE_TRANSACTION"
  | "INVALID_AMOUNT"
  | "INVALID_REQUEST"
  | "SELF_EXCLUDED"
  | "INTERNAL";

export class WalletError extends Error {
  constructor(
    public readonly code: WalletErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "WalletError";
  }
}

export const WALLET_SAFE_MESSAGES: Record<WalletErrorCode, string> = {
  NOT_AUTHORIZED: "Not authorized",
  NOT_FOUND: "Not found",
  INSUFFICIENT_CREDITS: "Insufficient credits",
  REAL_MONEY_DISABLED: "Real money is disabled",
  DUPLICATE_TRANSACTION: "Transaction already processed",
  INVALID_AMOUNT: "Invalid amount",
  INVALID_REQUEST: "Invalid request",
  SELF_EXCLUDED: "Action unavailable",
  INTERNAL: "Something went wrong",
};

export function mapWalletDbError(err: unknown): WalletError {
  if (err instanceof WalletError) return err;
  const msg = err instanceof Error ? err.message : String(err);
  if (/not_authorized|permission denied|forbidden/i.test(msg))
    return new WalletError("NOT_AUTHORIZED");
  if (/not_found|no rows/i.test(msg)) return new WalletError("NOT_FOUND");
  if (/insufficient_credits|insufficient balance|balance/i.test(msg))
    return new WalletError("INSUFFICIENT_CREDITS");
  if (/real_money|cash|withdraw/i.test(msg))
    return new WalletError("REAL_MONEY_DISABLED");
  if (/duplicate|idempotency|already (granted|credited|refunded)/i.test(msg))
    return new WalletError("DUPLICATE_TRANSACTION");
  if (/invalid_amount|negative|zero amount/i.test(msg))
    return new WalletError("INVALID_AMOUNT");
  if (/self_excluded/i.test(msg)) return new WalletError("SELF_EXCLUDED");
  if (/invalid|validation|check constraint/i.test(msg))
    return new WalletError("INVALID_REQUEST");
  return new WalletError("INTERNAL");
}
