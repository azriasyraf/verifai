-- Verifai T2 Schema (user-level isolation — no organisations)
-- Run this in full in Supabase SQL Editor before starting the app.
-- RLS is enabled on every table from day 1.
-- user_id isolation uses auth.jwt() ->> 'user_id' set by Clerk JWT template.

-- ============================================================
-- ENGAGEMENTS
-- ============================================================
CREATE TABLE engagements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  client_name text,
  department text,
  period_from text,
  period_to text,
  engagement_ref text,
  auditor_name text,
  primary_contact_name text,
  primary_contact_title text,
  process text,
  sector_context text,
  jurisdiction text DEFAULT 'International',
  status text DEFAULT 'active',
  client_group text
);

ALTER TABLE engagements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "engagements_user" ON engagements
  USING ((auth.jwt() ->> 'user_id') = user_id);

-- ============================================================
-- AUDIT PROGRAMS
-- ============================================================
CREATE TABLE audit_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid REFERENCES engagements(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  ai_original jsonb NOT NULL,
  current_version jsonb NOT NULL,
  analytics_tests jsonb,
  raised_findings jsonb,
  exit_meeting jsonb
);

ALTER TABLE audit_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_programs_user" ON audit_programs
  USING ((auth.jwt() ->> 'user_id') = user_id);

-- ============================================================
-- WALKTHROUGH WORKING PAPERS
-- ============================================================
CREATE TABLE walkthrough_papers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid REFERENCES engagements(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  ai_original jsonb NOT NULL,
  current_version jsonb NOT NULL,
  checkpoint_responses jsonb,
  freeform_notes text,
  overall_conclusion text
);

ALTER TABLE walkthrough_papers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "walkthrough_papers_user" ON walkthrough_papers
  USING ((auth.jwt() ->> 'user_id') = user_id);

-- ============================================================
-- GOVERNANCE ASSESSMENTS (RMGA)
-- ============================================================
CREATE TABLE governance_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid REFERENCES engagements(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  ai_original jsonb NOT NULL,
  current_version jsonb NOT NULL,
  overall_conclusion text,
  auditor_fills jsonb
);

ALTER TABLE governance_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "governance_assessments_user" ON governance_assessments
  USING ((auth.jwt() ->> 'user_id') = user_id);

-- ============================================================
-- AUDIT REPORTS
-- ============================================================
CREATE TABLE audit_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid REFERENCES engagements(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  ai_original jsonb NOT NULL,
  current_version jsonb NOT NULL,
  source_findings jsonb
);

ALTER TABLE audit_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_reports_user" ON audit_reports
  USING ((auth.jwt() ->> 'user_id') = user_id);

-- ============================================================
-- FINDINGS
-- ============================================================
CREATE TABLE findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid REFERENCES engagements(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  ref text,
  control_id text,
  risk_id text,
  finding_description text,
  condition text,
  criteria text,
  cause text,
  effect text,
  risk_rating text,
  recommendation text,
  management_response text,
  due_date date,
  status text DEFAULT 'Open',
  process text,
  control_category text,
  regulatory_refs text[],
  source text DEFAULT 'generated'
);

ALTER TABLE findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "findings_user" ON findings
  USING ((auth.jwt() ->> 'user_id') = user_id);

-- Findings indexes for repeat detection queries (Findings Mapping & Flagging feature)
CREATE INDEX ON findings (user_id, process, control_category);
CREATE INDEX ON findings (user_id, control_category);
CREATE INDEX ON findings (user_id, control_category) WHERE source != 'historical_import';

-- ============================================================
-- MANAGEMENT ACTIONS
-- ============================================================
CREATE TABLE management_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id uuid REFERENCES findings(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  action_description text,
  owner text,
  due_date date,
  status text DEFAULT 'Open',
  completion_date date,
  follow_up_engagement_id uuid REFERENCES engagements(id)
);

ALTER TABLE management_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "management_actions_user" ON management_actions
  USING (
    (auth.jwt() ->> 'user_id') = user_id
    AND (
      follow_up_engagement_id IS NULL
      OR EXISTS (
        SELECT 1 FROM engagements e
        WHERE e.id = follow_up_engagement_id
        AND e.user_id = (auth.jwt() ->> 'user_id')
      )
    )
  );

-- ============================================================
-- DOCUMENT REQUESTS (PBC List)
-- ============================================================
CREATE TABLE document_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id uuid REFERENCES engagements(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  document_name text NOT NULL,
  purpose text,
  related_control text,
  requested_by text,
  requested_date date,
  auditee_owner text,
  received_date date,
  status text DEFAULT 'Pending',
  notes text,
  source text DEFAULT 'manual'
);

ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "document_requests_user" ON document_requests
  USING ((auth.jwt() ->> 'user_id') = user_id);

-- ============================================================
-- MIGRATIONS (run these if upgrading an existing T2 database)
-- Safe to skip on fresh installs — columns already in CREATE TABLE above.
-- ============================================================

-- Findings Mapping & Flagging (Feb 2026)
-- ALTER TABLE engagements ADD COLUMN IF NOT EXISTS client_group text;
-- ALTER TABLE findings ADD COLUMN IF NOT EXISTS process text;
-- ALTER TABLE findings ADD COLUMN IF NOT EXISTS control_category text;
-- ALTER TABLE findings ADD COLUMN IF NOT EXISTS regulatory_refs text[];
-- ALTER TABLE findings ADD COLUMN IF NOT EXISTS source text DEFAULT 'generated';
-- CREATE INDEX IF NOT EXISTS ON findings (user_id, process, control_category);
-- CREATE INDEX IF NOT EXISTS ON findings (user_id, control_category);
-- CREATE INDEX IF NOT EXISTS ON findings (user_id, control_category) WHERE source != 'historical_import';

-- Document Requests / PBC List (Mar 2026)
-- CREATE TABLE document_requests ( id uuid PRIMARY KEY DEFAULT gen_random_uuid(), engagement_id uuid REFERENCES engagements(id) ON DELETE CASCADE, user_id text NOT NULL, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), document_name text NOT NULL, purpose text, related_control text, requested_by text, requested_date date, auditee_owner text, received_date date, status text DEFAULT 'Pending', notes text, source text DEFAULT 'manual' );
-- ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "document_requests_user" ON document_requests USING ((auth.jwt() ->> 'user_id') = user_id);
