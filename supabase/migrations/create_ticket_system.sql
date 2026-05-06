/*
  # Create Ticket System and Moderation Logs

  1. New Tables
    - `tickets`
      - `id` (uuid, primary key)
      - `ticket_number` (integer, unique auto-incrementing display ID)
      - `guild_id` (text, Discord guild ID)
      - `channel_id` (text, Discord channel ID)
      - `creator_id` (text, Discord user ID who created the ticket)
      - `status` (enum: open, closed, pending)
      - `subject` (text, ticket subject/title)
      - `created_at` (timestamp)
      - `closed_at` (timestamp, nullable)
    
    - `moderation_logs`
      - `id` (uuid, primary key)
      - `guild_id` (text, Discord guild ID)
      - `action` (text: kick, ban, mute, warn, unban, unmute)
      - `moderator_id` (text, Discord user ID who performed action)
      - `target_user_id` (text, Discord user ID who was targeted)
      - `reason` (text, moderation reason)
      - `duration` (integer, duration in minutes for temp actions, nullable)
      - `created_at` (timestamp)
    
    - `ticket_panels`
      - `id` (uuid, primary key)
      - `guild_id` (text, Discord guild ID, unique)
      - `message_id` (text, Discord message ID of the panel)
      - `channel_id` (text, Discord channel ID)
      - `title` (text, panel title)
      - `description` (text, panel description)
      - `button_label` (text, button label)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Tables are public but have audit trail capabilities
*/

CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number SERIAL UNIQUE NOT NULL,
  guild_id text NOT NULL,
  channel_id text NOT NULL,
  creator_id text NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'closed', 'pending')),
  subject text NOT NULL,
  created_at timestamptz DEFAULT now(),
  closed_at timestamptz
);

CREATE INDEX IF NOT EXISTS tickets_guild_idx ON tickets(guild_id);
CREATE INDEX IF NOT EXISTS tickets_status_idx ON tickets(status);

CREATE TABLE IF NOT EXISTS moderation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('kick', 'ban', 'mute', 'warn', 'unban', 'unmute')),
  moderator_id text NOT NULL,
  target_user_id text NOT NULL,
  reason text,
  duration integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS moderation_guild_idx ON moderation_logs(guild_id);
CREATE INDEX IF NOT EXISTS moderation_action_idx ON moderation_logs(action);

CREATE TABLE IF NOT EXISTS ticket_panels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id text NOT NULL UNIQUE,
  message_id text NOT NULL,
  channel_id text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  button_label text DEFAULT 'Open Ticket',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ticket_panel_guild_idx ON ticket_panels(guild_id);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_panels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for tickets"
  ON tickets FOR SELECT
  USING (true);

CREATE POLICY "Public insert access for tickets"
  ON tickets FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update access for tickets"
  ON tickets FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public read access for moderation logs"
  ON moderation_logs FOR SELECT
  USING (true);

CREATE POLICY "Public insert access for moderation logs"
  ON moderation_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public read access for ticket panels"
  ON ticket_panels FOR SELECT
  USING (true);

CREATE POLICY "Public insert access for ticket panels"
  ON ticket_panels FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update access for ticket panels"
  ON ticket_panels FOR UPDATE
  USING (true)
  WITH CHECK (true);