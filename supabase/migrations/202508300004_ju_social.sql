-- JU PICKS — JU Rooms, Challenges, Leaderboards, Notifications, Admin
-- REAL_MONEY_ENABLED=false. Virtual credits only. No cash value.
-- Depends on: 000_compat, 001_foundation, 002_jp_rpcs, 003_persistence_hardening

-- ═══════════════════════════════════════════════════════════════
-- JU ROOMS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.ju_rooms (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  description  text NOT NULL DEFAULT '',
  owner_id     uuid NOT NULL,
  is_private   boolean NOT NULL DEFAULT true,
  invite_code  text NOT NULL UNIQUE DEFAULT upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
  max_members  int NOT NULL DEFAULT 50,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ju_room_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    uuid NOT NULL REFERENCES public.ju_rooms(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL,
  role       text NOT NULL DEFAULT 'member',
  joined_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);

ALTER TABLE public.ju_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ju_room_members ENABLE ROW LEVEL SECURITY;

-- Public rooms visible to all; private rooms only to members
CREATE POLICY ju_rooms_select ON public.ju_rooms FOR SELECT TO authenticated
  USING (
    NOT is_private
    OR id IN (SELECT room_id FROM public.ju_room_members WHERE user_id = auth.uid())
  );

CREATE POLICY ju_rooms_insert ON public.ju_rooms FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY ju_rooms_update ON public.ju_rooms FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY ju_rooms_delete ON public.ju_rooms FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- Members: readable if room is public or user is a member
CREATE POLICY ju_members_select ON public.ju_room_members FOR SELECT TO authenticated
  USING (
    room_id IN (
      SELECT id FROM public.ju_rooms WHERE NOT is_private
      UNION
      SELECT room_id FROM public.ju_room_members WHERE user_id = auth.uid()
    )
  );

-- Users can join public rooms themselves; private rooms via RPC (owner invite)
CREATE POLICY ju_members_insert ON public.ju_room_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY ju_members_delete ON public.ju_room_members FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR room_id IN (SELECT id FROM public.ju_rooms WHERE owner_id = auth.uid())
  );

-- RPC: Create room (auto-adds owner as member)
CREATE OR REPLACE FUNCTION public.jp_create_room(
  p_name text,
  p_description text DEFAULT '',
  p_is_private boolean DEFAULT true
) RETURNS public.ju_rooms AS $$
DECLARE r public.ju_rooms;
BEGIN
  INSERT INTO public.ju_rooms (name, description, owner_id, is_private)
  VALUES (p_name, p_description, auth.uid(), p_is_private)
  RETURNING * INTO r;
  INSERT INTO public.ju_room_members (room_id, user_id, role)
  VALUES (r.id, auth.uid(), 'owner');
  RETURN r;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Join room by invite code
CREATE OR REPLACE FUNCTION public.jp_join_room_by_code(
  p_invite_code text
) RETURNS public.ju_rooms AS $$
DECLARE r public.ju_rooms;
BEGIN
  SELECT * INTO r FROM public.ju_rooms WHERE invite_code = upper(p_invite_code);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found or invalid invite code';
  END IF;
  IF r.is_private AND r.owner_id <> auth.uid() THEN
    -- Private-room access is controlled by possession of the invite code.
    NULL;
  END IF;
  INSERT INTO public.ju_room_members (room_id, user_id, role)
  VALUES (r.id, auth.uid(), 'member')
  ON CONFLICT (room_id, user_id) DO NOTHING;
  RETURN r;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Leave room
CREATE OR REPLACE FUNCTION public.jp_leave_room(
  p_room_id uuid
) RETURNS void AS $$
BEGIN
  DELETE FROM public.ju_room_members
  WHERE room_id = p_room_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Get room members
CREATE OR REPLACE FUNCTION public.jp_get_room_members(
  p_room_id uuid
) RETURNS TABLE (
  user_id uuid,
  role text,
  joined_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT rm.user_id, rm.role, rm.joined_at
  FROM public.ju_room_members rm
  WHERE rm.room_id = p_room_id
  ORDER BY rm.joined_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- JU CHALLENGES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.ju_challenges (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id   uuid NOT NULL,
  challenged_id   uuid NOT NULL,
  status          text NOT NULL DEFAULT 'pending',
  -- pending → accepted → completed → declined → cancelled
  stake_credits   int NOT NULL DEFAULT 100,
  challenger_pick jsonb,
  challenged_pick jsonb,
  winner_id       uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz
);

ALTER TABLE public.ju_challenges ENABLE ROW LEVEL SECURITY;

-- Users can see challenges where they are challenger or challenged
CREATE POLICY ju_challenges_select ON public.ju_challenges FOR SELECT TO authenticated
  USING (challenger_id = auth.uid() OR challenged_id = auth.uid());

CREATE POLICY ju_challenges_insert ON public.ju_challenges FOR INSERT TO authenticated
  WITH CHECK (challenger_id = auth.uid());

CREATE POLICY ju_challenges_update ON public.ju_challenges FOR UPDATE TO authenticated
  USING (challenger_id = auth.uid() OR challenged_id = auth.uid());

-- RPC: Create challenge
CREATE OR REPLACE FUNCTION public.jp_create_challenge(
  p_challenged_id uuid,
  p_stake_credits int DEFAULT 100
) RETURNS public.ju_challenges AS $$
DECLARE r public.ju_challenges;
BEGIN
  IF p_challenged_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot challenge yourself';
  END IF;
  IF p_stake_credits < 1 OR p_stake_credits > 100000 THEN
    RAISE EXCEPTION 'Invalid stake amount';
  END IF;
  INSERT INTO public.ju_challenges (challenger_id, challenged_id, stake_credits)
  VALUES (auth.uid(), p_challenged_id, p_stake_credits)
  RETURNING * INTO r;
  RETURN r;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Accept challenge
CREATE OR REPLACE FUNCTION public.jp_accept_challenge(
  p_challenge_id uuid
) RETURNS void AS $$
BEGIN
  UPDATE public.ju_challenges
  SET status = 'accepted', updated_at = now()
  WHERE id = p_challenge_id AND challenged_id = auth.uid() AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Challenge not found or not pending for you';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Decline challenge
CREATE OR REPLACE FUNCTION public.jp_decline_challenge(
  p_challenge_id uuid
) RETURNS void AS $$
BEGIN
  UPDATE public.ju_challenges
  SET status = 'declined', updated_at = now()
  WHERE id = p_challenge_id AND (challenger_id = auth.uid() OR challenged_id = auth.uid())
    AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Challenge not found or not pending';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Complete challenge (server-side settlement only)
CREATE OR REPLACE FUNCTION public.jp_complete_challenge(
  p_challenge_id uuid,
  p_winner_id uuid
) RETURNS void AS $$
BEGIN
  UPDATE public.ju_challenges
  SET status = 'completed', winner_id = p_winner_id,
      completed_at = now(), updated_at = now()
  WHERE id = p_challenge_id AND status = 'accepted';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Challenge not found or not accepted';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- NOTIFICATIONS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.ju_notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  type        text NOT NULL,
  title       text NOT NULL,
  body        text NOT NULL DEFAULT '',
  is_read     boolean NOT NULL DEFAULT false,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ju_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY ju_notifications_select ON public.ju_notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY ju_notifications_update ON public.ju_notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY ju_notifications_insert ON public.ju_notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY ju_notifications_delete ON public.ju_notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- RPC: Mark notification as read
CREATE OR REPLACE FUNCTION public.jp_mark_notification_read(
  p_notification_id uuid
) RETURNS void AS $$
BEGIN
  UPDATE public.ju_notifications
  SET is_read = true
  WHERE id = p_notification_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- ADMIN AUDIT LOG
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.ju_audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    uuid NOT NULL,
  action      text NOT NULL,
  target_type text,
  target_id   text,
  details     jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ju_audit_log ENABLE ROW LEVEL SECURITY;

-- Foundation schema stores admin authority in profiles.role.
CREATE POLICY ju_audit_select ON public.ju_audit_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY ju_audit_insert ON public.ju_audit_log FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- RPC: Admin wallet adjustment (requires admin)
CREATE OR REPLACE FUNCTION public.jp_admin_wallet_adjust(
  p_user_id uuid,
  p_amount_cents bigint,
  p_reason text
) RETURNS void AS $$
DECLARE
  v_is_admin boolean;
  v_wallet_id uuid;
  v_balance bigint;
BEGIN
  SELECT (role IN ('admin', 'superadmin'))
    INTO v_is_admin
  FROM public.profiles
  WHERE user_id = auth.uid();

  IF COALESCE(v_is_admin, false) = false THEN
    RAISE EXCEPTION 'Not authorized: admin only';
  END IF;
  IF p_amount_cents = 0 THEN
    RAISE EXCEPTION 'Adjustment amount must be non-zero';
  END IF;

  SELECT wallet_id, balance_cents
    INTO v_wallet_id, v_balance
  FROM public.wallets
  WHERE user_id = p_user_id AND wallet_kind = 'play'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;

  IF v_balance + p_amount_cents < 0 THEN
    RAISE EXCEPTION 'Adjustment would make balance negative';
  END IF;

  v_balance := v_balance + p_amount_cents;

  UPDATE public.wallets
  SET balance_cents = v_balance, updated_at = now()
  WHERE wallet_id = v_wallet_id;

  INSERT INTO public.wallet_transactions
    (wallet_id, user_id, type, amount_cents, balance_after_cents, reason, created_at)
  VALUES
    (v_wallet_id, p_user_id, 'ADMIN_ADJUSTMENT', p_amount_cents, v_balance, p_reason, now());

  INSERT INTO public.ju_audit_log (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'WALLET_ADJUST', 'user', p_user_id::text,
    jsonb_build_object('amount_cents', p_amount_cents, 'reason', p_reason));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- LEADERBOARDS
-- ═══════════════════════════════════════════════════════════════

-- Settlement facts live in settlement_runs, not entries.
CREATE OR REPLACE VIEW public.ju_leaderboard_global AS
SELECT
  e.user_id,
  COUNT(*) AS total_entries,
  COUNT(*) FILTER (WHERE sr.outcome = 'WIN') AS wins,
  COUNT(*) FILTER (WHERE sr.outcome = 'LOSS') AS losses,
  COUNT(*) FILTER (WHERE sr.outcome = 'PUSH') AS pushes,
  COALESCE(SUM(sr.reward_credits_cents - e.entry_amount_cents), 0) AS total_profit_cents
FROM public.entries e
JOIN public.settlement_runs sr ON sr.entry_id = e.entry_id
GROUP BY e.user_id
ORDER BY total_profit_cents DESC;

CREATE OR REPLACE VIEW public.ju_leaderboard_weekly AS
SELECT
  e.user_id,
  COUNT(*) AS total_entries,
  COUNT(*) FILTER (WHERE sr.outcome = 'WIN') AS wins,
  COUNT(*) FILTER (WHERE sr.outcome = 'LOSS') AS losses,
  COALESCE(SUM(sr.reward_credits_cents - e.entry_amount_cents), 0) AS total_profit_cents
FROM public.entries e
JOIN public.settlement_runs sr ON sr.entry_id = e.entry_id
WHERE sr.created_at >= date_trunc('week', now())
GROUP BY e.user_id
ORDER BY total_profit_cents DESC;

CREATE OR REPLACE VIEW public.ju_leaderboard_monthly AS
SELECT
  e.user_id,
  COUNT(*) AS total_entries,
  COUNT(*) FILTER (WHERE sr.outcome = 'WIN') AS wins,
  COUNT(*) FILTER (WHERE sr.outcome = 'LOSS') AS losses,
  COALESCE(SUM(sr.reward_credits_cents - e.entry_amount_cents), 0) AS total_profit_cents
FROM public.entries e
JOIN public.settlement_runs sr ON sr.entry_id = e.entry_id
WHERE sr.created_at >= date_trunc('month', now())
GROUP BY e.user_id
ORDER BY total_profit_cents DESC;

-- RPC: Get leaderboard (scope: global, weekly, monthly)
CREATE OR REPLACE FUNCTION public.jp_get_leaderboard(
  p_scope text DEFAULT 'global',
  p_limit int DEFAULT 50
) RETURNS TABLE (
  user_id uuid,
  total_entries bigint,
  wins bigint,
  losses bigint,
  total_profit_cents bigint
) AS $$
BEGIN
  IF p_scope = 'weekly' THEN
    RETURN QUERY
    SELECT l.user_id, l.total_entries, l.wins, l.losses, l.total_profit_cents
    FROM public.ju_leaderboard_weekly l
    LIMIT p_limit;
  ELSIF p_scope = 'monthly' THEN
    RETURN QUERY
    SELECT l.user_id, l.total_entries, l.wins, l.losses, l.total_profit_cents
    FROM public.ju_leaderboard_monthly l
    LIMIT p_limit;
  ELSE
    RETURN QUERY
    SELECT l.user_id, l.total_entries, l.wins, l.losses, l.total_profit_cents
    FROM public.ju_leaderboard_global l
    LIMIT p_limit;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grants
GRANT SELECT ON public.ju_rooms TO authenticated;
GRANT SELECT ON public.ju_room_members TO authenticated;
GRANT INSERT,DELETE ON public.ju_room_members TO authenticated;
GRANT INSERT,UPDATE,DELETE ON public.ju_rooms TO authenticated;

GRANT SELECT ON public.ju_challenges TO authenticated;
GRANT INSERT,UPDATE ON public.ju_challenges TO authenticated;

GRANT SELECT,INSERT,UPDATE,DELETE ON public.ju_notifications TO authenticated;

GRANT SELECT ON public.ju_audit_log TO authenticated;
GRANT INSERT ON public.ju_audit_log TO authenticated;

GRANT SELECT ON public.ju_leaderboard_global TO authenticated;
GRANT SELECT ON public.ju_leaderboard_weekly TO authenticated;
GRANT SELECT ON public.ju_leaderboard_monthly TO authenticated;

-- service_role grants for server-side settlement/admin
GRANT ALL ON public.ju_challenges TO service_role;
GRANT ALL ON public.ju_audit_log TO service_role;
GRANT ALL ON public.ju_notifications TO service_role;
