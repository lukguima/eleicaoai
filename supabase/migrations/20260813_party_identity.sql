-- Identidade do partido: logo nas artes + preferência de exibição.
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS party_logo_url TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS show_party_logo BOOLEAN DEFAULT true;
