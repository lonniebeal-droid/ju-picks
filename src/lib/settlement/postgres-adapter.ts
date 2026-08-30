/**
 * JU PICKS — Postgres/Supabase SettlementPersistenceAdapter
 *
 * Activates only when a DbClient is configured.
 * Uses authoritative SQL from migrations (jp_apply_settlement + reads).
 * Keeps fail-closed UnconfiguredSettlementAdapter as default registry value.
 */

import type {
  SettlementPersistenceAdapter,
  ApplySettlementPayload,
} from "./internal";
import type {
  SettlementEntrySnapshot,
  FinalProjectionResult,
  SettlementRewardConfig,
  SettlementResult,
  FlexOutcomeRule,
} from "./types";
import {
  SettlementEntrySnapshotSchema,
  FinalProjectionResultSchema,
  SettlementRewardConfigSchema,
  SettlementResultSchema,
} from "./types";
import { SettlementError } from "./errors";
import { getDbClient, isDbConfigured, DbNotConfiguredError } from "~/lib/db/client";
import { jpApplySettlement } from "~/lib/db/jp-rpc";

function requireDb() {
  if (!isDbConfigured()) {
    throw new SettlementError(
      "INTERNAL",
      "Settlement persistence adapter requires database configuration",
    );
  }
  return getDbClient();
}

export class PostgresSettlementAdapter implements SettlementPersistenceAdapter {
  readonly id = "postgres";

  async loadEntryForSettlement(
    entryId: string,
  ): Promise<SettlementEntrySnapshot | null> {
    const db = requireDb();
    const entryRes = await db.query<{
      entry_id: string;
      user_id: string;
      contest_type_id: string;
      power_mode: boolean;
      entry_amount_cents: number;
      status: string;
      settlement_version: number;
    }>(
      `SELECT entry_id, user_id, contest_type_id, power_mode,
              entry_amount_cents, status, settlement_version
       FROM entries WHERE entry_id = $1`,
      [entryId],
    );
    if (!entryRes.rows.length) return null;
    const e = entryRes.rows[0];

    const picksRes = await db.query<{
      projection_id: string;
      direction: string;
      locked_line: number;
    }>(
      `SELECT projection_id, direction, locked_line
       FROM entry_picks WHERE entry_id = $1`,
      [entryId],
    );

    const snapshot = {
      entryId: e.entry_id,
      userId: e.user_id,
      contestTypeId: e.contest_type_id,
      mode: e.power_mode ? ("POWER" as const) : ("FLEX" as const),
      entryAmountCredits: Number(e.entry_amount_cents),
      status: e.status,
      settlementVersion: Number(e.settlement_version),
      picks: picksRes.rows.map((p) => {
        const d = String(p.direction).toUpperCase();
        const direction =
          d === "HIGHER" || d === "OVER"
            ? ("HIGHER" as const)
            : d === "LOWER" || d === "UNDER"
              ? ("LOWER" as const)
              : null;
        if (!direction) {
          throw new SettlementError("INVALID_SETTLEMENT_INPUT");
        }
        return {
          projectionId: p.projection_id,
          direction,
          lockedLine: Number(p.locked_line),
        };
      }),
    };

    return SettlementEntrySnapshotSchema.parse(snapshot);
  }

  async loadFinalResults(
    projectionIds: string[],
  ): Promise<FinalProjectionResult[]> {
    if (projectionIds.length === 0) return [];
    const db = requireDb();
    const res = await db.query<{
      projection_id: string;
      actual_value: number | null;
      is_final: boolean;
      is_void: boolean;
    }>(
      `SELECT projection_id, actual_value, is_final, is_void
       FROM projection_results
       WHERE projection_id = ANY($1::uuid[])`,
      [projectionIds],
    );

    return res.rows.map((r) =>
      FinalProjectionResultSchema.parse({
        projectionId: r.projection_id,
        actualValue:
          r.actual_value == null ? null : Number(r.actual_value),
        isFinal: Boolean(r.is_final),
        isVoid: Boolean(r.is_void),
      }),
    );
  }

  async resolveContestConfig(
    contestTypeId: string,
    mode: "POWER" | "FLEX",
  ): Promise<SettlementRewardConfig | null> {
    const db = requireDb();
    const res = await db.query<{
      contest_type_id: string;
      mode: string;
      win_multiplier: number | null;
      flex_rules: unknown;
    }>(
      `SELECT contest_type_id, mode, win_multiplier, flex_rules
       FROM contest_reward_configs
       WHERE contest_type_id = $1`,
      [contestTypeId],
    );
    if (!res.rows.length) return null;
    const row = res.rows[0];
    if (row.mode !== mode) {
      throw new SettlementError("CONTEST_CONFIG_MISSING");
    }

    let flexRules: FlexOutcomeRule[] | null = null;
    if (row.flex_rules != null) {
      const raw = Array.isArray(row.flex_rules)
        ? row.flex_rules
        : typeof row.flex_rules === "string"
          ? JSON.parse(row.flex_rules)
          : row.flex_rules;
      if (Array.isArray(raw)) {
        flexRules = raw.map((r: Record<string, unknown>) => ({
          minWins: Number(r.minWins ?? r.min_wins),
          maxLosses:
            r.maxLosses != null || r.max_losses != null
              ? Number(r.maxLosses ?? r.max_losses)
              : null,
          outcome: String(r.outcome) as FlexOutcomeRule["outcome"],
          multiplier:
            r.multiplier != null ? Number(r.multiplier) : null,
        }));
      }
    }

    return SettlementRewardConfigSchema.parse({
      contestTypeId: row.contest_type_id,
      mode: row.mode,
      winMultiplier:
        row.win_multiplier == null ? null : Number(row.win_multiplier),
      flexRules,
    });
  }

  async applySettlementTransaction(
    payload: ApplySettlementPayload,
  ): Promise<{
    alreadySettled: boolean;
    credited: boolean;
    result: SettlementResult;
  }> {
    requireDb();

    try {
      const applied = await jpApplySettlement({
        entryId: payload.entryId,
        outcome: payload.outcome,
        picks: payload.picks.map((p) => ({
          projectionId: p.projectionId,
          outcome: p.outcome,
          actualValue: p.actualValue,
        })),
        rewardCredits: payload.rewardCredits,
        idempotencyKey: payload.idempotencyKey,
        expectedVersion: payload.settlementVersion ?? null,
      });

      const summary = {
        wins: payload.picks.filter((p) => p.outcome === "WIN").length,
        losses: payload.picks.filter((p) => p.outcome === "LOSS").length,
        pushes: payload.picks.filter((p) => p.outcome === "PUSH").length,
        voids: payload.picks.filter((p) => p.outcome === "VOID").length,
        pending: payload.picks.filter((p) => p.outcome === "PENDING").length,
        total: payload.picks.length,
        resolved: payload.picks.filter((p) => p.outcome !== "PENDING").length,
      };

      const db = getDbClient();
      const modeRes = await db.query<{ power_mode: boolean }>(
        `SELECT power_mode FROM entries WHERE entry_id = $1`,
        [payload.entryId],
      );
      if (!modeRes.rows.length) {
        throw new SettlementError("ENTRY_NOT_FOUND");
      }
      const mode = modeRes.rows[0].power_mode ? "POWER" : "FLEX";

      const result = SettlementResultSchema.parse({
        entryId: applied.entry_id,
        outcome: applied.outcome,
        mode,
        picks: payload.picks,
        summary,
        rewardCredits: applied.reward_credits_cents ?? payload.rewardCredits,
        rewardAvailable: payload.rewardAvailable,
        alreadySettled: applied.already_settled,
        credited: applied.credited,
      });

      return {
        alreadySettled: applied.already_settled,
        credited: applied.credited,
        result,
      };
    } catch (err) {
      if (err instanceof SettlementError) throw err;
      if (err instanceof DbNotConfiguredError) {
        throw new SettlementError("INTERNAL", "Database is not configured");
      }
      const msg = err instanceof Error ? err.message : String(err);
      if (/SETTLEMENT_ALREADY_APPLIED/i.test(msg)) {
        throw new SettlementError("SETTLEMENT_ALREADY_APPLIED");
      }
      if (/SETTLEMENT_CONFLICT/i.test(msg)) {
        throw new SettlementError("SETTLEMENT_CONFLICT");
      }
      if (/ENTRY_NOT_FOUND/i.test(msg)) {
        throw new SettlementError("ENTRY_NOT_FOUND");
      }
      if (/ENTRY_NOT_READY/i.test(msg)) {
        throw new SettlementError("ENTRY_NOT_READY");
      }
      throw new SettlementError("INTERNAL");
    }
  }
}

/**
 * Register Postgres adapter when DB is configured; otherwise leave fail-closed default.
 * Import setSettlementPersistenceAdapter at call sites to avoid circular init issues,
 * or pass the setter explicitly.
 */
export function createPostgresSettlementAdapter(): PostgresSettlementAdapter {
  if (!isDbConfigured()) {
    throw new SettlementError(
      "INTERNAL",
      "Cannot create Postgres settlement adapter without database",
    );
  }
  return new PostgresSettlementAdapter();
}
