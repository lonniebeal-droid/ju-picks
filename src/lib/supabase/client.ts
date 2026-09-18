// JU PICKS - Hardened Supabase Client (Batch 4 Dev-Auth Fix)
// Fail-closed in production
// Fake auth only when NODE_ENV !== 'production' AND JU_PICKS_DEV_AUTH=true

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

// Create the base Supabase client
const baseClient = createClient(supabaseUrl, supabaseKey);

/**
 * Get Supabase client with dev-auth hardening
 * Fails closed in production - no synthetic dev-user fallback
 */
export function getSupabaseClient() {
  // Check if we are in production
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Check if dev auth is explicitly enabled
  const devAuthEnabled = process.env.JU_PICKS_DEV_AUTH === 'true';
  
  // In production: always use the real client, no fallback
  if (isProduction) {
    return baseClient;
  }
  
  // In development: only allow dev-user fallback if explicitly enabled
  if (!devAuthEnabled) {
    return baseClient;
  }
  
  // Development with explicit dev auth enabled
  // This is the ONLY place where synthetic dev-user is allowed
  const devClient = createClient(supabaseUrl, supabaseKey, {
    db: {
      schema: 'public',
    },
    auth: {
      // In dev mode with explicit flag, we can have a synthetic session
      // but this should NEVER be used in production
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  
  return devClient;
}

/**
 * Get Supabase client for server-side operations
 * Always uses service role or admin credentials in production
 */
export function getSupabaseAdminClient() {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // In production, use service role key
    const serviceKey = process.env.SUPABASE_SERVICE_KEY || '';
    if (!serviceKey) {
      throw new Error('SUPABASE_SERVICE_KEY is required in production');
    }
    return createClient(supabaseUrl, serviceKey);
  }
  
  // In development, we can use the anon key for testing
  return baseClient;
}

// Export the base client for backward compatibility
export { baseClient as supabase };

export default baseClient;