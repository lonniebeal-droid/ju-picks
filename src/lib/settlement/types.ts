/**
 * JU PICKS — Settlement domain types (Batch 8)
 * Virtual credits only. Server/internal use. No browser-authoritative inputs.
 */

import { z } from "zod";

export const PickOutcomeSchema = z.enum([
  "PENDING",
  "WIN",
  "LOSS",
  "PUSH",
  "VOID",
]);
export type PickOutcome = z.infer<typeof PickOutcomeSchema>;

export const EntryOutcomeSchema = z.enum([
  "PENDING",
  "WIN",
  "LOSS",
  "PUSH",
  "VOID",
]);
export type EntryOutcome = z.infer<typeof EntryOutcomeSchema>;

export const EntryModeSchema = z.enum(["POWER", "FLEX"]);
export type EntryMode = z.infer<typeof EntryModeSchema>;

export const PickDirectionSchema = z.enum(["HIGHER", "LOWER"]);
export type PickDirection = z.infer<typeof PickDirectionSchema>;

export const SettlePickInputSchema = z.object({
  direction: PickDirectionSchema,
  line: z.number().finite(),
  actualValue: z.number().finite().nullable(),
  isVoid: z.boolean(),
  isFinal: z.boolean(),
});
export type SettlePickInput = z.infer<typeof SettlePickInputSchema>;

export const SettledPickSchema = z.object({
  projectionId: z.string().uuid(),
  direction: PickDirectionSchema,
  line: z.number().finite(),
  actualValue: z.number().finite().nullable(),
  outcome: PickOutcomeSchema,
});
export type SettledPick = z.infer<typeof SettledPickSchema>;

export const PickOutcomeSummarySchema = z.object({
  wins: z.number().int().nonnegative(),
  losses: z.number().int().nonnegative(),
  pushes: z.number().int().nonnegative(),
  voids: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  resolved: z.number().int().nonnegative(),
});
export type PickOutcomeSummary = z.infer<typeof PickOutcomeSummarySchema>;

export const EntryOutcomeResultSchema = z.object({
  outcome: EntryOutcomeSchema,
  summary: PickOutcomeSummarySchema,
  effectivePickCount: z.number().int().nonnegative(),
  requiresContestConfig: z.boolean().optional().default(false),
});
export type EntryOutcomeResult = z.infer<typeof EntryOutcomeResultSchema>;

export const FlexOutcomeRuleSchema = z.object({
  minWins: z.number().int().nonnegative(),
  maxLosses: z.number().int().nonnegative().optional().nullable(),
  outcome: EntryOutcomeSchema.exclude(["PENDING"]),
  multiplier: z.number().finite().positive().nullable().optional(),
});
export type FlexOutcomeRule = z.infer<typeof FlexOutcomeRuleSchema>;

export const SettlementRewardConfigSchema = z.object({
  contestTypeId: z.string().uuid(),
  mode: EntryModeSchema,
  winMultiplier: z.number().finite().positive().nullable(),
  flexRules: z.array(FlexOutcomeRuleSchema).nullable().optional(),
});
export type SettlementRewardConfig = z.infer<typeof SettlementRewardConfigSchema>;

export const SettlementRewardResultSchema = z.object({
  rewardCredits: z.number().int().nonnegative().nullable(),
  available: z.boolean(),
  note: z.string(),
});
export type SettlementRewardResult = z.infer<typeof SettlementRewardResultSchema>;

export const InternalSettleEntryRequestSchema = z.object({
  entryId: z.string().uuid(),
  idempotencyKey: z.string().min(8).max(128),
});
export type InternalSettleEntryRequest = z.infer<typeof InternalSettleEntryRequestSchema>;

export const SettlementResultSchema = z.object({
  entryId: z.string().uuid(),
  outcome: EntryOutcomeSchema,
  mode: EntryModeSchema,
  picks: z.array(SettledPickSchema),
  summary: PickOutcomeSummarySchema,
  rewardCredits: z.number().int().nonnegative().nullable(),
  rewardAvailable: z.boolean(),
  alreadySettled: z.boolean(),
  credited: z.boolean(),
});
export type SettlementResult = z.infer<typeof SettlementResultSchema>;

export const SettlementEntryPickSchema = z.object({
  projectionId: z.string().uuid(),
  direction: PickDirectionSchema,
  lockedLine: z.number().finite(),
});
export type SettlementEntryPick = z.infer<typeof SettlementEntryPickSchema>;

export const SettlementEntrySnapshotSchema = z.object({
  entryId: z.string().uuid(),
  userId: z.string().uuid(),
  contestTypeId: z.string().uuid(),
  mode: EntryModeSchema,
  entryAmountCredits: z.number().int().positive(),
  status: z.string().min(1),
  settlementVersion: z.number().int().nonnegative().optional().nullable(),
  picks: z.array(SettlementEntryPickSchema).min(1).max(20),
});
export type SettlementEntrySnapshot = z.infer<typeof SettlementEntrySnapshotSchema>;

export const FinalProjectionResultSchema = z.object({
  projectionId: z.string().uuid(),
  actualValue: z.number().finite().nullable(),
  isFinal: z.boolean(),
  isVoid: z.boolean(),
});
export type FinalProjectionResult = z.infer<typeof FinalProjectionResultSchema>;
