/**
 * JU PICKS Batch 4 - Auth API handlers
 * Server-authoritative. No browser input trusted for auth decisions.
 * REAL_MONEY_ENABLED=false - Virtual credits only.
 *
 * No Express dependency — handlers accept minimal request/response shapes
 * so typecheck passes without packages not present in package.json.
 */

import {
  ensureProfile,
  getVirtualBalance,
  getLedger,
  placeEntry,
  cancelEntry,
  getMyEntries,
  getMyEntry,
  getSportsBoard,
  getSportBoard,
  getEventBoard,
  getPlayerBoard,
} from "../../../lib/jupicks/server-fns";

export const REAL_MONEY_ENABLED = false as const;

/** Minimal request shape (no express). */
interface HandlerReq {
  body?: Record<string, unknown>;
  query?: Record<string, string | string[] | undefined>;
  params?: Record<string, string | undefined>;
}

/** Minimal response shape (no express). */
interface HandlerRes {
  status: (code: number) => HandlerRes;
  json: (body: unknown) => void;
}

function q(req: HandlerReq, key: string): string | undefined {
  const v = req.query?.[key];
  return Array.isArray(v) ? v[0] : v;
}

export async function handleGetAuth(_req: HandlerReq, res: HandlerRes) {
  try {
    const profile = await ensureProfile();
    const balance = await getVirtualBalance();
    res.json({
      success: true,
      profile,
      balance: balance.balance_cents,
      walletId: balance.walletId,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : "Authentication failed",
    });
  }
}

export async function handleGetBalance(_req: HandlerReq, res: HandlerRes) {
  try {
    const balance = await getVirtualBalance();
    res.json({
      success: true,
      balance_cents: balance.balance_cents,
      walletId: balance.walletId,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : "Authentication failed",
    });
  }
}

export async function handleGetLedger(req: HandlerReq, res: HandlerRes) {
  try {
    const limitRaw = q(req, "limit");
    const limit = limitRaw ? Number(limitRaw) : 50;
    const ledger = await getLedger(limit);
    res.json({ success: true, ledger });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : "Authentication failed",
    });
  }
}

export async function handlePlaceEntry(req: HandlerReq, res: HandlerRes) {
  try {
    const body = req.body ?? {};
    const contestTypeId = String(body.contestTypeId ?? "");
    const entryAmountCredits = Number(body.entryAmountCredits ?? body.stake_cents ?? 0);
    const powerMode = Boolean(body.powerMode ?? body.entryType === "POWER");
    const idempotencyKey = String(body.idempotencyKey ?? `entry-${Date.now()}`);
    const picks = Array.isArray(body.picks)
      ? (body.picks as Array<{ projectionId: string; direction: "HIGHER" | "LOWER" }>)
      : [];

    for (const p of picks) {
      if (!["HIGHER", "LOWER"].includes(p.direction)) {
        res.status(400).json({ success: false, error: "Invalid pick direction" });
        return;
      }
    }

    const entry = await placeEntry({
      contestTypeId,
      entryAmountCredits,
      picks,
      powerMode,
      idempotencyKey,
    });

    res.json({ success: true, entry });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : "Entry placement failed",
    });
  }
}

export async function handleCancelEntry(req: HandlerReq, res: HandlerRes) {
  try {
    const id = req.params?.id ?? "";
    const idempotencyKey = String(req.body?.idempotencyKey ?? `refund-${id}-${Date.now()}`);
    const result = await cancelEntry(id, idempotencyKey);
    res.json({
      success: result.success,
      message: result.message,
      balance_cents: result.balance_cents,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : "Entry cancellation failed",
    });
  }
}

export async function handleGetEntries(req: HandlerReq, res: HandlerRes) {
  try {
    const status = q(req, "status");
    const entries = await getMyEntries(status);
    res.json({ success: true, entries });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get entries",
    });
  }
}

export async function handleGetEntry(req: HandlerReq, res: HandlerRes) {
  try {
    const id = req.params?.id ?? "";
    const entry = await getMyEntry(id);
    if (!entry) {
      res.status(404).json({ success: false, error: "Entry not found" });
      return;
    }
    res.json({ success: true, entry });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get entry",
    });
  }
}

export async function handleGetSportsBoard(_req: HandlerReq, res: HandlerRes) {
  try {
    const board = await getSportsBoard();
    res.json({ success: true, ...board });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get sports board",
    });
  }
}

export async function handleGetSportBoard(req: HandlerReq, res: HandlerRes) {
  try {
    const sport = req.params?.sport ?? "";
    const board = await getSportBoard(sport);
    res.json({ success: true, ...board });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get sport board",
    });
  }
}

export async function handleGetEventBoard(req: HandlerReq, res: HandlerRes) {
  try {
    const eventId = req.params?.eventId ?? "";
    const board = await getEventBoard(eventId);
    res.json({ success: true, ...board });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get event board",
    });
  }
}

export async function handleGetPlayerBoard(req: HandlerReq, res: HandlerRes) {
  try {
    const playerId = req.params?.playerId ?? "";
    const board = await getPlayerBoard(playerId);
    res.json({ success: true, ...board });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get player board",
    });
  }
}
