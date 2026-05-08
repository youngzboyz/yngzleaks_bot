-- Tabla para configuración de bienvenidas
CREATE TABLE IF NOT EXISTS welcome_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id text NOT NULL UNIQUE,
  enabled boolean DEFAULT false,
  channel_id text,
  message text,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS welcome_config_guild_idx ON welcome_config(guild_id);

-- Tabla para configuración de comandos
CREATE TABLE IF NOT EXISTS command_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id text NOT NULL,
  command_name text NOT NULL,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(guild_id, command_name)
);

CREATE INDEX IF NOT EXISTS command_config_guild_idx ON command_config(guild_id);

-- Habilitar RLS
ALTER TABLE welcome_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE command_config ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso público
CREATE POLICY "Public read access for welcome_config"
  ON welcome_config FOR SELECT
  USING (true);

CREATE POLICY "Public insert access for welcome_config"
  ON welcome_config FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update access for welcome_config"
  ON welcome_config FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public read access for command_config"
  ON command_config FOR SELECT
  USING (true);

CREATE POLICY "Public insert access for command_config"
  ON command_config FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update access for command_config"
  ON command_config FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Made with Bob
