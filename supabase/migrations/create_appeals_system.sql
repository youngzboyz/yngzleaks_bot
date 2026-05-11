/*
  # Appeals + Soft-ban persistence

  Purpose:
  - Persist soft-ban state so that !unbanappeal can restore permissions even after bot restarts.
  - Track appeal channels to support message forwarding.

  Tables:
  - soft_bans
    Stores who is soft-banned in which guild and the moderator/reason.
  - appeal_channels
    Stores mapping from user -> appeal channel.

  Notes:
  - This project currently uses permission overwrites to "hide" users.
  - The bot uses a scan fallback if no per-channel snapshot exists.
*/

CREATE TABLE IF NOT EXISTS soft_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id text NOT NULL,
  target_user_id text NOT NULL,
  moderator_id text NOT NULL,
  reason text,
  banned_at timestamptz DEFAULT now(),
  -- Store channel overwrites we changed (JSON array). Optional.
  -- Shape example:
  -- [ { channelId: '...', hadOverwrite: true, originalOverwrite: {allow: '...', deny: '...'} }, ... ]
  channel_snapshot jsonb,
  UNIQUE (guild_id, target_user_id)
);

CREATE INDEX IF NOT EXISTS soft_bans_guild_idx ON soft_bans(guild_id);
CREATE INDEX IF NOT EXISTS soft_bans_target_idx ON soft_bans(target_user_id);

CREATE TABLE IF NOT EXISTS appeal_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id text NOT NULL,
  target_user_id text NOT NULL,
  channel_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  UNIQUE (guild_id, target_user_id)
);

CREATE INDEX IF NOT EXISTS appeal_channels_guild_idx ON appeal_channels(guild_id);
CREATE INDEX IF NOT EXISTS appeal_channels_target_idx ON appeal_channels(target_user_id);

ALTER TABLE soft_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE appeal_channels ENABLE ROW LEVEL SECURITY;

-- Public policies: this bot uses anon key for server-side operations.
-- You may want to restrict in the future.

CREATE POLICY "Public read access for soft_bans"
  ON soft_bans FOR SELECT
  USING (true);

CREATE POLICY "Public insert access for soft_bans"
  ON soft_bans FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update access for soft_bans"
  ON soft_bans FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public read access for appeal_channels"
  ON appeal_channels FOR SELECT
  USING (true);

CREATE POLICY "Public insert access for appeal_channels"
  ON appeal_channels FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update access for appeal_channels"
  ON appeal_channels FOR UPDATE
  USING (true)
  WITH CHECK (true);

