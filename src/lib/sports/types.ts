/**
 * JU PICKS — Normalized sports data DTOs
 */

import { z } from "zod";

export const SportSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  code: z.enum([
    "NFL",
    "NBA",
    "MLB",
    "NHL",
    "WNBA",
    "NCAAF",
    "NCAAB",
    "SOCCER",
  ]),
});
export type Sport = z.infer<typeof SportSchema>;

export const LeagueSchema = z.object({
  id: z.string().min(1),
  sportId: z.string().min(1),
  name: z.string().min(1),
  code: z.string().min(1),
  season: z.string().min(1),
});
export type League = z.infer<typeof LeagueSchema>;

export const TeamSchema = z.object({
  id: z.string().min(1),
  leagueId: z.string().min(1),
  name: z.string().min(1),
  abbreviation: z.string().min(1),
  city: z.string().min(1),
  logoUrl: z.string().url().optional().nullable(),
});
export type Team = z.infer<typeof TeamSchema>;

export const PlayerSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1).optional().nullable(),
  leagueId: z.string().min(1),
  name: z.string().min(1),
  position: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
});
export type Player = z.infer<typeof PlayerSchema>;

export const GameStatusSchema = z.enum([
  "scheduled",
  "in_progress",
  "final",
  "postponed",
  "cancelled",
]);
export type GameStatus = z.infer<typeof GameStatusSchema>;

export const GameSchema = z.object({
  id: z.string().min(1),
  leagueId: z.string().min(1),
  homeTeamId: z.string().min(1),
  awayTeamId: z.string().min(1),
  startsAt: z.string().datetime({ offset: true }),
  status: GameStatusSchema,
});
export type Game = z.infer<typeof GameSchema>;

export const PropStatusSchema = z.enum(["open", "locked", "settled", "void"]);
export type PropStatus = z.infer<typeof PropStatusSchema>;

export const PlayerPropSchema = z.object({
  id: z.string().min(1),
  gameId: z.string().min(1),
  playerId: z.string().min(1),
  statType: z.string().min(1),
  line: z.number(),
  higherAvailable: z.boolean(),
  lowerAvailable: z.boolean(),
  status: PropStatusSchema,
  sourceUpdatedAt: z.string().datetime({ offset: true }),
});
export type PlayerProp = z.infer<typeof PlayerPropSchema>;

export const PlayerStatSchema = z.object({
  playerId: z.string().min(1),
  gameId: z.string().min(1),
  statType: z.string().min(1),
  value: z.number(),
  sourceUpdatedAt: z.string().datetime({ offset: true }),
});
export type PlayerStat = z.infer<typeof PlayerStatSchema>;

export const GameResultSchema = z.object({
  gameId: z.string().min(1),
  homeScore: z.number().int().nonnegative(),
  awayScore: z.number().int().nonnegative(),
  status: GameStatusSchema,
  finalizedAt: z.string().datetime({ offset: true }).optional().nullable(),
});
export type GameResult = z.infer<typeof GameResultSchema>;

export const GamesFilterSchema = z.object({
  leagueId: z.string().min(1).optional(),
  sportCode: SportSchema.shape.code.optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  status: GameStatusSchema.optional(),
});
export type GamesFilter = z.infer<typeof GamesFilterSchema>;

export const TeamsFilterSchema = z.object({
  leagueId: z.string().min(1).optional(),
  sportCode: SportSchema.shape.code.optional(),
});
export type TeamsFilter = z.infer<typeof TeamsFilterSchema>;

export const PlayersFilterSchema = z.object({
  leagueId: z.string().min(1).optional(),
  teamId: z.string().min(1).optional(),
  sportCode: SportSchema.shape.code.optional(),
});
export type PlayersFilter = z.infer<typeof PlayersFilterSchema>;

export const PlayerPropsFilterSchema = z.object({
  gameId: z.string().min(1).optional(),
  playerId: z.string().min(1).optional(),
  leagueId: z.string().min(1).optional(),
  sportCode: SportSchema.shape.code.optional(),
});
export type PlayerPropsFilter = z.infer<typeof PlayerPropsFilterSchema>;

export const PlayerStatsFilterSchema = z.object({
  gameId: z.string().min(1).optional(),
  playerId: z.string().min(1).optional(),
});
export type PlayerStatsFilter = z.infer<typeof PlayerStatsFilterSchema>;

export const GameResultsFilterSchema = z.object({
  gameId: z.string().min(1).optional(),
  leagueId: z.string().min(1).optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});
export type GameResultsFilter = z.infer<typeof GameResultsFilterSchema>;

export const ProviderMetaSchema = z.object({
  fetchedAt: z.string().datetime({ offset: true }),
  sourceUpdatedAt: z.string().datetime({ offset: true }).optional().nullable(),
  providerId: z.string().min(1),
  isSynthetic: z.boolean().default(false),
});
export type ProviderMeta = z.infer<typeof ProviderMetaSchema>;

export type WithMeta<T> = {
  data: T;
  meta: ProviderMeta;
};
