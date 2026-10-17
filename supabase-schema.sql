-- ============================================================
-- HANAQAAD COLLEGE — SUPABASE DATABASE SCHEMA v4.0
-- Run this entire file in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. PROFILES (Admin / Teacher roles) ───────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'teacher')) DEFAULT 'teacher',
  first_name    TEXT,
  last_name     TEXT,
  phone         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. PROGRAMS (Dynamic, admin-managed) ──────────────────
CREATE TABLE IF NOT EXISTS programs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key           TEXT NOT NULL UNIQUE,          -- e.g. 'cld', 'ed', 'arabic'
  label         TEXT NOT NULL,                 -- e.g. 'Computer Literacy Diploma (CLD)'
  default_fee   NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_builtin    BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed built-in programs
INSERT INTO programs (key, label, default_fee, is_builtin) VALUES
  ('cld',    'Computer Literacy Diploma (CLD)', 150, true),
  ('ed',     'English Department (ED)',          120, true),
  ('tc',     'Training Course (TC)',             100, true),
  ('arabic', 'Arabic Language (Arabic)',          80, true),
  ('maths',  'Mathematics (Maths)',               80, true)
ON CONFLICT (key) DO NOTHING;

-- ── 3. STUDENTS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  student_id    TEXT UNIQUE,                   -- e.g. HC-500, HC-501
  phone         TEXT NOT NULL,
  program       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'graduated', 'suspended')),
  security_pin  TEXT,                          -- 4-digit PIN for portal verification
  fee_amount    NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_free       BOOLEAN NOT NULL DEFAULT false,
  address       TEXT,
  notes         TEXT,
  registered_by UUID REFERENCES profiles(id),  -- which admin/teacher registered them
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique, guaranteed-sequential student ID function
CREATE OR REPLACE FUNCTION next_student_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  max_num  INTEGER := 499;
  existing INTEGER;
BEGIN
  SELECT COALESCE(MAX(
    CASE WHEN student_id ~ '^HC-[0-9]+$'
         THEN CAST(SUBSTRING(student_id FROM 4) AS INTEGER)
         ELSE 499
    END
  ), 499)
  INTO max_num
  FROM students
  WHERE student_id ~ '^HC-[0-9]+$';

  RETURN 'HC-' || (max_num + 1)::TEXT;
END;
$$;

-- ── 4. ATTENDANCE ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id    UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  notes         TEXT,
  recorded_by   UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, date)
);

-- ── 5. FEES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fees (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  total_fee       NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount_paid     NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_date    DATE,
  payment_method  TEXT DEFAULT 'cash'
                    CHECK (payment_method IN ('cash', 'edahab', 'zaad', 'bank', 'other')),
  notes           TEXT,
  recorded_by     UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 6. EXAMS (Examination Results) ────────────────────────
CREATE TABLE IF NOT EXISTS exams (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id    UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  exam_name     TEXT NOT NULL,
  subject       TEXT NOT NULL,
  marks         NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_marks   NUMERIC(5,2) NOT NULL DEFAULT 100,
  grade         TEXT,
  exam_date     DATE,
  notes         TEXT,
  recorded_by   UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 7. CONTACT MESSAGES ───────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_messages (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  phone         TEXT,
  email         TEXT,
  program       TEXT,
  message       TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── AUTO-UPDATE TRIGGERS ──────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS students_updated_at ON students;
CREATE TRIGGER students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS attendance_updated_at ON attendance;
CREATE TRIGGER attendance_updated_at BEFORE UPDATE ON attendance FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS fees_updated_at ON fees;
CREATE TRIGGER fees_updated_at BEFORE UPDATE ON fees FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS exams_updated_at ON exams;
CREATE TRIGGER exams_updated_at BEFORE UPDATE ON exams FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── ROW LEVEL SECURITY ────────────────────────────────────
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE students          ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance        ENABLE ROW LEVEL SECURITY;
ALTER TABLE fees              ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams             ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages  ENABLE ROW LEVEL SECURITY;

-- Helper: is the current user an admin?
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Helper: is the current user an admin or teacher?
CREATE OR REPLACE FUNCTION is_staff() RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher')
  );
$$;

-- Drop any old conflicting policies first
DROP POLICY IF EXISTS "Profiles: read own or admin"                 ON profiles;
DROP POLICY IF EXISTS "Profiles: admins can insert/update/delete"   ON profiles;
DROP POLICY IF EXISTS "Profiles: staff can read"                    ON profiles;
DROP POLICY IF EXISTS "Profiles: admin manages"                     ON profiles;
DROP POLICY IF EXISTS "Programs: read all"                          ON programs;
DROP POLICY IF EXISTS "Programs: admins all"                        ON programs;
DROP POLICY IF EXISTS "Programs: staff read"                        ON programs;
DROP POLICY IF EXISTS "Programs: admin write"                       ON programs;
DROP POLICY IF EXISTS "Students: admins all"                        ON students;
DROP POLICY IF EXISTS "Students: teachers read assigned"            ON students;
DROP POLICY IF EXISTS "Students: staff read all"                    ON students;
DROP POLICY IF EXISTS "Students: staff write"                       ON students;
DROP POLICY IF EXISTS "Students: public search by id"               ON students;
DROP POLICY IF EXISTS "Attendance: admins all"                      ON attendance;
DROP POLICY IF EXISTS "Attendance: teachers manage assigned"        ON attendance;
DROP POLICY IF EXISTS "Attendance: staff manage"                    ON attendance;
DROP POLICY IF EXISTS "Fees: admins only"                           ON fees;
DROP POLICY IF EXISTS "Fees: admin manage"                          ON fees;
DROP POLICY IF EXISTS "Exams: staff manage"                         ON exams;
DROP POLICY IF EXISTS "Contact: public insert"                      ON contact_messages;
DROP POLICY IF EXISTS "Contact: admin read"                         ON contact_messages;
DROP POLICY IF EXISTS "Public: insert contact messages"             ON contact_messages;
DROP POLICY IF EXISTS "Authenticated users: read contact messages"  ON contact_messages;

-- PROFILES: Users see their own. Admins see all. Admins manage all.
CREATE POLICY "Profiles: staff can read"
  ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR is_admin());

CREATE POLICY "Profiles: admin manages"
  ON profiles FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- PROGRAMS: All authenticated staff can read. Only admins can write.
CREATE POLICY "Programs: staff read"
  ON programs FOR SELECT TO authenticated USING (is_staff());

CREATE POLICY "Programs: admin write"
  ON programs FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- STUDENTS:
-- Staff (admin+teacher) can read and write all students.
-- Public (anon) can only look up a single student by student_id (for portal) — NO sensitive data exposed.
CREATE POLICY "Students: staff write"
  ON students FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

-- Public student lookup: anon can only select non-sensitive columns via a view (see below).
-- We block direct anon select on the full table.

-- ATTENDANCE: Staff can manage.
CREATE POLICY "Attendance: staff manage"
  ON attendance FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

-- FEES: Admins only. Teachers cannot see fees.
CREATE POLICY "Fees: admin manage"
  ON fees FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- EXAMS: Staff can manage.
CREATE POLICY "Exams: staff manage"
  ON exams FOR ALL TO authenticated
  USING (is_staff()) WITH CHECK (is_staff());

-- CONTACT MESSAGES: Anon can insert. Admins can read.
CREATE POLICY "Contact: public insert"
  ON contact_messages FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Contact: admin read"
  ON contact_messages FOR SELECT TO authenticated USING (is_admin());

-- ── PUBLIC PORTAL VIEW (safe, limited columns) ─────────────
-- Drop and recreate so anon can look up ONLY by student_id + pin match.
-- We expose only: student_id, first_name, last_name, program, status.
-- Sensitive fields (pin, phone, address, fee_amount) are NOT included.
DROP VIEW IF EXISTS public_student_lookup;
CREATE VIEW public_student_lookup AS
  SELECT
    id,
    student_id,
    first_name,
    last_name,
    program,
    status
  FROM students
  WHERE status = 'active';

-- Grant anon access to the view only (not base table)
GRANT SELECT ON public_student_lookup TO anon;

-- ── TRIGGER: Auto-create profile on signup ─────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'teacher'),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ── INDEXES ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_students_student_id    ON students(student_id);
CREATE INDEX IF NOT EXISTS idx_students_program        ON students(program);
CREATE INDEX IF NOT EXISTS idx_students_status         ON students(status);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_fees_student_id         ON fees(student_id);
CREATE INDEX IF NOT EXISTS idx_exams_student_id        ON exams(student_id);

-- ── 9. SECURE STUDENT PORTAL RPC (2-Factor Verification: ID + PIN) ──
CREATE OR REPLACE FUNCTION get_student_portal_record(p_student_id TEXT, p_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student RECORD;
  v_attendance JSONB;
  v_fees JSONB;
  v_exams JSONB;
  v_result JSONB;
  v_pin_match BOOLEAN := false;
  v_clean_query_id TEXT;
  v_clean_pin TEXT;
BEGIN
  v_clean_query_id := TRIM(LOWER(p_student_id));
  v_clean_pin := TRIM(p_pin);

  -- Find student by student_id or id (case-insensitive)
  SELECT * INTO v_student
  FROM students
  WHERE LOWER(student_id) = v_clean_query_id OR id::text = v_clean_query_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND');
  END IF;

  -- Verify PIN: match security_pin or last 4 digits of phone
  IF (v_student.security_pin IS NOT NULL AND TRIM(v_student.security_pin) = v_clean_pin)
     OR (v_student.phone IS NOT NULL AND RIGHT(REGEXP_REPLACE(v_student.phone, '[^0-9]', '', 'g'), 4) = v_clean_pin) THEN
    v_pin_match := true;
  END IF;

  IF NOT v_pin_match THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_PIN');
  END IF;

  -- 1. Attendance Metrics
  SELECT jsonb_build_object(
    'total_sessions', COUNT(*),
    'present_count', COUNT(*) FILTER (WHERE status = 'present'),
    'absent_count', COUNT(*) FILTER (WHERE status = 'absent'),
    'late_count', COUNT(*) FILTER (WHERE status = 'late'),
    'excused_count', COUNT(*) FILTER (WHERE status = 'excused')
  ) INTO v_attendance
  FROM attendance
  WHERE student_id = v_student.id;

  -- 2. Fees Records
  SELECT jsonb_build_object(
    'total_fee', COALESCE((SELECT SUM(total_fee) FROM fees WHERE student_id = v_student.id), v_student.fee_amount, 0),
    'amount_paid', COALESCE((SELECT SUM(amount_paid) FROM fees WHERE student_id = v_student.id), 0),
    'is_free', v_student.is_free,
    'notes', (SELECT notes FROM fees WHERE student_id = v_student.id ORDER BY created_at DESC LIMIT 1)
  ) INTO v_fees;

  -- 3. Exams Records
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id,
    'exam_name', exam_name,
    'subject', subject,
    'marks', marks,
    'total_marks', total_marks,
    'grade', grade,
    'exam_date', exam_date,
    'notes', notes
  ) ORDER BY exam_date DESC), '[]'::jsonb) INTO v_exams
  FROM exams
  WHERE student_id = v_student.id;

  -- Compile Verified Record
  v_result := jsonb_build_object(
    'success', true,
    'student', jsonb_build_object(
      'id', v_student.id,
      'student_id', v_student.student_id,
      'first_name', v_student.first_name,
      'last_name', v_student.last_name,
      'program', v_student.program,
      'status', v_student.status,
      'phone', v_student.phone,
      'is_free', v_student.is_free,
      'fee_amount', v_student.fee_amount,
      'created_at', v_student.created_at
    ),
    'attendance', v_attendance,
    'fees', v_fees,
    'exams', v_exams
  );

  RETURN v_result;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION get_student_portal_record(TEXT, TEXT) TO anon, authenticated;

-- ── NOTES ──────────────────────────────────────────────────
-- After running this schema:
-- 1. Create your admin account in Supabase Auth (Dashboard → Authentication → Users → Add user)
-- 2. Then run: UPDATE profiles SET role = 'admin' WHERE id = 'YOUR-ADMIN-UUID';
-- 3. Teachers are created by the Admin through the dashboard (they get role='teacher' by default).
