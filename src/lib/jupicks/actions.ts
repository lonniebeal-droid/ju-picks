// JU PICKS - Batch 4 Server Actions
// Server-authoritative actions for JU PICKS platform
// REAL_MONEY_ENABLED=false - Virtual credits only

import { getServerSession } from '../auth/dev-auth';
import { ensureProfile, getVirtualBalance, placeEntry, cancelEntry, getMyEntries, getMyEntry, getLedger } from './server-fns';

// Constants
export const REAL_MONEY_ENABLED = false;

export async function ensureProfileAction() {
  try {
    const session = await getServerSession();
    if (!session || !session.userId) {
      return { success: false, profile: null, error: 'Unauthorized: No active session' };
    }
    const profile = await ensureProfile(session.userId);
    return { success: true, profile };
  } catch (error) {
    return { success: false, profile: null, error: error instanceof Error ? error.message : 'Failed to ensure profile' };
  }
}