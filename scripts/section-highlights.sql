CREATE TABLE IF NOT EXISTS section_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  block_id uuid REFERENCES content_blocks(id) ON DELETE SET NULL,
  selected_text text NOT NULL,
  note text,
  color text NOT NULL DEFAULT 'yellow',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE section_highlights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own highlights" ON section_highlights;
CREATE POLICY "Users manage own highlights"
  ON section_highlights
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_highlights_user_section ON section_highlights (user_id, section_id);
CREATE INDEX IF NOT EXISTS idx_highlights_section ON section_highlights (section_id);
