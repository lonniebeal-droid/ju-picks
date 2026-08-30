-- JU PICKS foundation migration
-- Virtual credits only. REAL_MONEY_ENABLED=false at application layer.
-- *_cents columns retained for compatibility; app exposes virtual credits.

-- profiles
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'superadmin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- wallets (play only)
CREATE TABLE IF NOT EXISTS wallets (
  wallet_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id),
  wallet_kind TEXT NOT NULL DEFAULT 'play' CHECK (wallet_kind = 'play'),
  balance_cents BIGINT NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),
  starting_credit_granted BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, wallet_kind)
);

-- wallet ledger
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(wallet_id),
  user_id UUID NOT NULL REFERENCES profiles(user_id),
  type TEXT NOT NULL CHECK (type IN (
    'STARTING_CREDIT', 'ENTRY_STAKE', 'ENTRY_WIN', 'ENTRY_REFUND', 'ADMIN_ADJUSTMENT'
  )),
  amount_cents BIGINT NOT NULL,
  balance_after_cents BIGINT NOT NULL CHECK (balance_after_cents >= 0),
  entry_id UUID,
  reason TEXT,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

-- sports reference
CREATE TABLE IF NOT EXISTS sports (
  sport_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  abbr TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS teams (
  team_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_id UUID REFERENCES sports(sport_id),
  name TEXT NOT NULL,
  abbr TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS players (
  player_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(team_id),
  display_name TEXT NOT NULL,
  position TEXT
);

CREATE TABLE IF NOT EXISTS events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_id UUID REFERENCES sports(sport_id),
  home_team_id UUID REFERENCES teams(team_id),
  away_team_id UUID REFERENCES teams(team_id),
  starts_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled'
);

CREATE TABLE IF NOT EXISTS stat_types (
  stat_type_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  abbr TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projections (
  projection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(event_id),
  player_id UUID NOT NULL REFERENCES players(player_id),
  stat_type_id UUID NOT NULL REFERENCES stat_types(stat_type_id),
  line NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  higher_open BOOLEAN NOT NULL DEFAULT true,
  lower_open BOOLEAN NOT NULL DEFAULT true,
  featured BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS contest_types (
  contest_type_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('POWER', 'FLEX')),
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS entries (
  entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id),
  contest_type_id UUID NOT NULL REFERENCES contest_types(contest_type_id),
  entry_amount_cents BIGINT NOT NULL CHECK (entry_amount_cents > 0),
  power_mode BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'open',
  idempotency_key TEXT NOT NULL,
  settlement_version INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS entry_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES entries(entry_id),
  projection_id UUID NOT NULL REFERENCES projections(projection_id),
  direction TEXT NOT NULL CHECK (direction IN ('HIGHER', 'LOWER', 'over', 'under')),
  locked_line NUMERIC NOT NULL,
  outcome TEXT,
  UNIQUE (entry_id, projection_id)
);

-- RLS scaffolding (enable; policies require auth.uid() from Supabase)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_picks ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_own ON profiles
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY wallets_own ON wallets
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY wallet_tx_own ON wallet_transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY entries_own ON entries
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY entry_picks_own ON entry_picks
  FOR SELECT USING (
    entry_id IN (SELECT entry_id FROM entries WHERE user_id = auth.uid())
  );
