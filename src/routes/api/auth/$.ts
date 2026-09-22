/**
 * JU PICKS Batch 4 - Auth API Route
 * Server-authoritative auth endpoints. No browser input is ever trusted for auth decisions.
 * REAL_MONEY_ENABLED=false - Virtual credits only, no cash value.
 */

import { type Request, type Response } from 'express';
import { ensureProfile, getVirtualBalance, getLedger, placeEntry, cancelEntry, getMyEntries, getMyEntry, getSportsBoard, getSportBoard, getEventBoard, getPlayerBoard } from '../../lib/jupicks/server-fns';

export const REAL_MONEY_ENABLED = false as const;

// GET /api/auth - Get current user profile
export async function handleGetAuth(req: Request, res: Response) {
  try {
    const profile = await ensureProfile();
    const balance = await getVirtualBalance();
    
    res.json({
      success: true,
      profile,
      balance: balance.balance_cents,
      walletId: balance.walletId
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed'
    });
  }
}

// GET /api/auth/balance - Get virtual balance
export async function handleGetBalance(req: Request, res: Response) {
  try {
    const balance = await getVirtualBalance();
    res.json({
      success: true,
      balance_cents: balance.balance_cents,
      walletId: balance.walletId
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed'
    });
  }
}

// GET /api/auth/ledger - Get transaction ledger
export async function handleGetLedger(req: Request, res: Response) {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const ledger = await getLedger(limit);
    res.json({
      success: true,
      ledger
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed'
    });
  }
}

// POST /api/auth/entries - Place new entry
export async function handlePlaceEntry(req: Request, res: Response) {
  try {
    const { sport, eventId, playerId, pickDirection, stake_cents, entryType } = req.body;
    
    // Validate input - NEVER trust browser for direction mapping
    if (!['HIGHER', 'LOWER'].includes(pickDirection)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid pick direction'
      });
    }
    
    const entry = await placeEntry({
      sport,
      eventId,
      playerId,
      pickDirection,
      stake_cents: Number(stake_cents),
      entryType
    });
    
    res.json({
      success: true,
      entry
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : 'Entry placement failed'
    });
  }
}

// DELETE /api/auth/entries/:id - Cancel entry
export async function handleCancelEntry(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await cancelEntry(id);
    
    res.json({
      success: result.success,
      message: result.message
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : 'Entry cancellation failed'
    });
  }
}

// GET /api/auth/entries - Get user entries
export async function handleGetEntries(req: Request, res: Response) {
  try {
    const status = req.query.status as string | undefined;
    const entries = await getMyEntries(status);
    
    res.json({
      success: true,
      entries
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get entries'
    });
  }
}

// GET /api/auth/entries/:id - Get specific entry
export async function handleGetEntry(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const entry = await getMyEntry(id);
    
    if (!entry) {
      return res.status(404).json({
        success: false,
        error: 'Entry not found'
      });
    }
    
    res.json({
      success: true,
      entry
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get entry'
    });
  }
}

// Board endpoints
export async function handleGetSportsBoard(req: Request, res: Response) {
  try {
    const board = await getSportsBoard();
    res.json({
      success: true,
      ...board
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get sports board'
    });
  }
}

export async function handleGetSportBoard(req: Request, res: Response) {
  try {
    const { sport } = req.params;
    const board = await getSportBoard(sport);
    res.json({
      success: true,
      ...board
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get sport board'
    });
  }
}

export async function handleGetEventBoard(req: Request, res: Response) {
  try {
    const { eventId } = req.params;
    const board = await getEventBoard(eventId);
    res.json({
      success: true,
      ...board
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get event board'
    });
  }
}

export async function handleGetPlayerBoard(req: Request, res: Response) {
  try {
    const { playerId } = req.params;
    const board = await getPlayerBoard(playerId);
    res.json({
      success: true,
      ...board
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get player board'
    });
  }
}