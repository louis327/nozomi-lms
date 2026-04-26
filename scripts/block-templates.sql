CREATE TABLE IF NOT EXISTS block_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  block_type text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE block_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage block_templates" ON block_templates;
CREATE POLICY "Admins can manage block_templates"
  ON block_templates
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE INDEX IF NOT EXISTS idx_block_templates_created_at ON block_templates (created_at DESC);
