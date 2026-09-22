/**
 * JU PICKS API Routes Index
 * Server-authoritative endpoints for JU PICKS Batch 4 implementation.
 * REAL_MONEY_ENABLED=false - Virtual credits only, no cash value.
 */

// Re-export all auth endpoints
export {
  handleGetAuth,
  handleGetBalance,
  handleGetLedger,
  handlePlaceEntry,
  handleCancelEntry,
  handleGetEntries,
  handleGetEntry,
  handleGetSportsBoard,
  handleGetSportBoard,
  handleGetEventBoard,
  handleGetPlayerBoard,
  REAL_MONEY_ENABLED
} from './auth/$.ts';
