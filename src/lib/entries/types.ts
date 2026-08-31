/**
 * JU PICKS — Entry builder + submission DTOs
 */

import { z } from "zod";

export const PickDirectionSchema = z.enum(["HIGHER", "LOWER"]);
export type PickDirection = z.infer<typeof PickDirectionSchema>;

export const EntryModeSchema = z.enum(["POWER", "FLEX"]);
export type EntryMode = z.infer<typeof EntryModeSchema>;

export const EntryStatusSchema = z.enum([
  "open",
  "locked",
  "cancelled",
  "settled",
  "void",
]);
export type EntryStatus = z.infer<typeof EntryStatusSchema>;

export const EntryPickSelectionSchema = z.object({
  projectionId: z.string().uuid(),
  direction: PickDirectionSchema,
  playerId: z.string().optional().nullable(),
  playerName: z.string().optional().nullable(),
  statType: z.string().optional().nullable(),
  line: z.number().optional().nullable(),
});
export type EntryPickSelection = z.infer<typeof EntryPickSelectionSchema>;

export const EntryBuilderStateSchema = z.object({
  picks: z.array(EntryPickSelectionSchema).max(20),
  mode: EntryModeSchema,
  entryAmountCredits: z.number().int().nonnegative(),
  contestTypeId: z.string().uuid().optional().nullable(),
});
export type EntryBuilderState = z.infer<typeof EntryBuilderStateSchema>;

export const EntrySubmissionSchema = z.object({
  contestTypeId: z.string().uuid(),
  entryAmountCredits: z.number().int().positive().max(1_000_000),
  picks: z
    .array(
      z.object({
        projectionId: z.string().uuid(),
        direction: PickDirectionSchema,
      }),
    )
    .min(1)
    .max(20),
  powerMode: z.boolean(),
  idempotencyKey: z.string().min(8).max(128),
});
export type EntrySubmission = z.infer<typeof EntrySubmissionSchema>;

export const EntryPickDTOSchema = z.object({
  projectionId: z.string().uuid(),
  direction: PickDirectionSchema,
  playerName: z.string().optional().nullable(),
  statType: z.string().optional().nullable(),
  line: z.number().optional().nullable(),
  status: z.string().optional().nullable(),
});
export type EntryPickDTO = z.infer<typeof EntryPickDTOSchema>;

export const OpenEntryDTOSchema = z.object({
  entryId: z.string().uuid(),
  status: EntryStatusSchema,
  mode: EntryModeSchema,
  entryAmountCredits: z.number().int().nonnegative(),
  potentialRewardCredits: z.number().int().nonnegative().optional().nullable(),
  createdAt: z.string().datetime({ offset: true }),
  picks: z.array(EntryPickDTOSchema),
});
export type OpenEntryDTO = z.infer<typeof OpenEntryDTOSchema>;

export const PotentialRewardEstimateSchema = z.object({
  estimatedCredits: z.number().int().nonnegative().nullable(),
  available: z.boolean(),
  note: z.string(),
});
export type PotentialRewardEstimate = z.infer<typeof PotentialRewardEstimateSchema>;

export const CancelEntryInputSchema = z.object({
  entryId: z.string().uuid(),
});
export type CancelEntryInput = z.infer<typeof CancelEntryInputSchema>;

export const EntryListInputSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});
export type EntryListInput = z.infer<typeof EntryListInputSchema>;

export const EntryDetailInputSchema = z.object({
  entryId: z.string().uuid(),
});
export type EntryDetailInput = z.infer<typeof EntryDetailInputSchema>;
