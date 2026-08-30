/**
 * JU PICKS — Settlement persistence adapter boundary (fail-closed)
 */

import type {
  SettlementEntrySnapshot,
  FinalProjectionResult,
  SettlementRewardConfig,
  SettlementResult,
  SettledPick,
  EntryOutcome,
} from "./types";
import { SettlementError } from "./errors";

export interface ApplySettlementPayload {
  entryId: string;
  userId: string;
  outcome: EntryOutcome;
  picks: SettledPick[];
  rewardCredits: number | null;
  rewardAvailable: boolean;
  idempotencyKey: string;
  settlementVersion?: number | null;
}

export interface SettlementPersistenceAdapter {
  readonly id: string;
  loadEntryForSettlement(
    entryId: string,
  ): Promise<SettlementEntrySnapshot | null>;
  loadFinalResults(projectionIds: string[]): Promise<FinalProjectionResult[]>;
  resolveContestConfig(
    contestTypeId: string,
    mode: "POWER" | "FLEX",
  ): Promise<SettlementRewardConfig | null>;
  applySettlementTransaction(payload: ApplySettlementPayload): Promise<{
    alreadySettled: boolean;
    credited: boolean;
    result: SettlementResult;
  }>;
}

export class UnconfiguredSettlementAdapter
  implements SettlementPersistenceAdapter
{
  readonly id = "unconfigured";

  async loadEntryForSettlement(): Promise<SettlementEntrySnapshot | null> {
    throw new SettlementError(
      "INTERNAL",
      "Settlement persistence adapter is not configured",
    );
  }

  async loadFinalResults(): Promise<FinalProjectionResult[]> {
    throw new SettlementError(
      "INTERNAL",
      "Settlement persistence adapter is not configured",
    );
  }

  async resolveContestConfig(): Promise<SettlementRewardConfig | null> {
    throw new SettlementError(
      "INTERNAL",
      "Settlement persistence adapter is not configured",
    );
  }

  async applySettlementTransaction(): Promise<{
    alreadySettled: boolean;
    credited: boolean;
    result: SettlementResult;
  }> {
    throw new SettlementError(
      "INTERNAL",
      "Settlement persistence adapter is not configured",
    );
  }
}

let activeAdapter: SettlementPersistenceAdapter =
  new UnconfiguredSettlementAdapter();

export function setSettlementPersistenceAdapter(
  adapter: SettlementPersistenceAdapter,
): void {
  if (!adapter || typeof adapter.applySettlementTransaction !== "function") {
    throw new SettlementError(
      "INTERNAL",
      "Invalid settlement persistence adapter",
    );
  }
  activeAdapter = adapter;
}

export function getSettlementPersistenceAdapter(): SettlementPersistenceAdapter {
  return activeAdapter;
}

export function resetSettlementPersistenceAdapter(): void {
  activeAdapter = new UnconfiguredSettlementAdapter();
}
