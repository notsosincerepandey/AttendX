-- ====================================================================
-- AttendX Migration: Comprehensive Authentication, Timetable Architecture
-- & Historical Attendance Security Remediation (Hardened Final v2)
-- ====================================================================

-- 1. Ensure student_profiles contains role, scoped management, batch scope, academic_session_id, and archival columns
ALTER TABLE public.student_profiles 
  ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'class_admin', 'admin')),
  ADD COLUMN IF NOT EXISTS managed_branch_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS managed_section VARCHAR(50),
  ADD COLUMN IF NOT EXISTS managed_batch VARCHAR(20),
  ADD COLUMN IF NOT EXISTS academic_session_id UUID REFERENCES public.academic_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ALUMNI', 'TRANSFERRED', 'WITHDRAWN', 'SUSPENDED')),
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS deactivation_reason TEXT;

-- 2. Ensure timetable_versions contains academic_session_id
ALTER TABLE public.timetable_versions
  ADD COLUMN IF NOT EXISTS academic_session_id UUID REFERENCES public.academic_sessions(id) ON DELETE CASCADE;

-- 3. Security Definer functions with fixed search_path (prevents search_path hijacking)
-- Authoritatively trusts Supabase Auth app_metadata (cryptographically signed by Supabase private key)
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role'),
    (SELECT role FROM public.student_profiles WHERE user_id = auth.uid()),
    'student'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT public.get_auth_role() = 'admin';
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- 4. Scoped Class CR Verification Functions (Strict Non-Null Academic Session, University, Branch, Section & Batch)
CREATE OR REPLACE FUNCTION public.is_class_admin_for_section(p_section_id UUID, p_academic_session_id UUID)
RETURNS BOOLEAN AS $$
  SELECT public.is_admin() OR (
    public.get_auth_role() = 'class_admin' AND 
    p_academic_session_id IS NOT NULL AND 
    EXISTS (
      SELECT 1 
      FROM public.sections s
      JOIN public.branches b ON b.id = s.branch_id
      JOIN public.academic_sessions a ON a.id = p_academic_session_id AND a.university_id = b.university_id
      JOIN public.student_profiles sp ON sp.user_id = auth.uid()
      WHERE s.id = p_section_id
        AND (sp.managed_branch_code = b.code OR sp.branch_id = b.id)
        AND (sp.managed_section = s.section_name OR sp.section_id = s.id)
        AND sp.university_id = b.university_id
        AND sp.academic_session_id = a.id
        AND a.is_active = TRUE
        AND sp.is_active = TRUE
        AND sp.status = 'ACTIVE'
    )
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_class_admin_for_version(p_version_id UUID)
RETURNS BOOLEAN AS $$
  SELECT public.is_admin() OR EXISTS (
    SELECT 1 FROM public.timetable_versions tv
    WHERE tv.id = p_version_id
      AND tv.academic_session_id IS NOT NULL
      AND public.is_class_admin_for_section(tv.section_id, tv.academic_session_id)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_class_admin_for_slot(p_version_id UUID, p_batch VARCHAR(20) DEFAULT 'ALL')
RETURNS BOOLEAN AS $$
  SELECT public.is_admin() OR (
    public.is_class_admin_for_version(p_version_id) AND EXISTS (
      SELECT 1 FROM public.student_profiles sp
      WHERE sp.user_id = auth.uid()
        AND (
          sp.managed_batch IS NULL OR 
          sp.managed_batch = 'ALL' OR
          p_batch = 'ALL' OR 
          sp.managed_batch = p_batch
        )
    )
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- 5. Profile Security Triggers: Prevent unauthorized role escalation and profile tampering
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Restrict initial values for ordinary authenticated users
  IF auth.role() = 'authenticated' AND NOT public.is_admin() THEN
    IF NEW.role != 'student' THEN
      RAISE EXCEPTION 'Access Denied: Ordinary users cannot self-assign administrative or Class CR roles.';
    END IF;
    IF NEW.managed_branch_code IS NOT NULL OR NEW.managed_section IS NOT NULL OR NEW.managed_batch IS NOT NULL THEN
      RAISE EXCEPTION 'Access Denied: Ordinary users cannot self-assign Class CR management scopes.';
    END IF;
    IF NEW.status != 'ACTIVE' OR NEW.is_active != TRUE THEN
      RAISE EXCEPTION 'Access Denied: Invalid initial account status.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS tr_prevent_insert_role_escalation ON public.student_profiles;
CREATE TRIGGER tr_prevent_insert_role_escalation
  BEFORE INSERT ON public.student_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile();

CREATE OR REPLACE FUNCTION public.handle_profile_security()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.role() = 'authenticated' AND NOT public.is_admin() THEN
    -- Non-admins cannot alter their role
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Access Denied: Only administrators can assign or alter roles.';
    END IF;
    -- Immutable core identity fields
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Access Denied: user_id is immutable.';
    END IF;
    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Access Denied: Profile ID is immutable.';
    END IF;
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Access Denied: created_at timestamp is immutable.';
    END IF;
    -- Academic assignment protection
    IF NEW.university_id IS DISTINCT FROM OLD.university_id THEN
      RAISE EXCEPTION 'Access Denied: University assignment is immutable.';
    END IF;
    IF NEW.branch_id IS DISTINCT FROM OLD.branch_id THEN
      RAISE EXCEPTION 'Access Denied: Branch assignment can only be modified by an administrator.';
    END IF;
    IF NEW.section_id IS DISTINCT FROM OLD.section_id THEN
      RAISE EXCEPTION 'Access Denied: Section assignment can only be modified by an administrator.';
    END IF;
    IF NEW.batch IS DISTINCT FROM OLD.batch THEN
      RAISE EXCEPTION 'Access Denied: Batch assignment can only be modified by an administrator.';
    END IF;
    IF NEW.semester IS DISTINCT FROM OLD.semester THEN
      RAISE EXCEPTION 'Access Denied: Semester enrollment can only be modified by an administrator.';
    END IF;
    IF NEW.academic_session IS DISTINCT FROM OLD.academic_session THEN
      RAISE EXCEPTION 'Access Denied: Academic session can only be modified by an administrator.';
    END IF;
    IF NEW.academic_session_id IS DISTINCT FROM OLD.academic_session_id THEN
      RAISE EXCEPTION 'Access Denied: academic_session_id can only be modified by an administrator.';
    END IF;
    -- Scoped management protection
    IF NEW.managed_branch_code IS DISTINCT FROM OLD.managed_branch_code OR
       NEW.managed_section IS DISTINCT FROM OLD.managed_section OR
       NEW.managed_batch IS DISTINCT FROM OLD.managed_batch THEN
      RAISE EXCEPTION 'Access Denied: Class CR management scope can only be assigned by an administrator.';
    END IF;
    -- Status and deactivation protection
    IF NEW.status IS DISTINCT FROM OLD.status OR 
       NEW.is_active IS DISTINCT FROM OLD.is_active OR
       NEW.deactivated_at IS DISTINCT FROM OLD.deactivated_at OR
       NEW.deactivation_reason IS DISTINCT FROM OLD.deactivation_reason THEN
      RAISE EXCEPTION 'Access Denied: Account status and deactivation can only be modified by an administrator.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS tr_prevent_role_escalation ON public.student_profiles;
CREATE TRIGGER tr_prevent_role_escalation
  BEFORE UPDATE ON public.student_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_profile_security();

-- 6. Extend student_timetable_overrides to support personal custom slots & validation constraints
ALTER TABLE public.student_timetable_overrides
  ALTER COLUMN timetable_slot_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS day_of_week VARCHAR(20),
  ADD COLUMN IF NOT EXISTS period_number INT,
  ADD COLUMN IF NOT EXISTS custom_subject_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS custom_subject_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS custom_start_time TIME,
  ADD COLUMN IF NOT EXISTS custom_end_time TIME,
  ADD COLUMN IF NOT EXISTS applicable_batch VARCHAR(20) DEFAULT 'ALL',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add timetable override check constraints safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chk_overrides_custom_times' AND table_name = 'student_timetable_overrides'
  ) THEN
    ALTER TABLE public.student_timetable_overrides 
      ADD CONSTRAINT chk_overrides_custom_times 
      CHECK (custom_start_time IS NULL OR custom_end_time IS NULL OR custom_start_time < custom_end_time);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chk_overrides_day_of_week' AND table_name = 'student_timetable_overrides'
  ) THEN
    ALTER TABLE public.student_timetable_overrides 
      ADD CONSTRAINT chk_overrides_day_of_week 
      CHECK (day_of_week IS NULL OR day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chk_overrides_period_number' AND table_name = 'student_timetable_overrides'
  ) THEN
    ALTER TABLE public.student_timetable_overrides 
      ADD CONSTRAINT chk_overrides_period_number 
      CHECK (period_number IS NULL OR (period_number BETWEEN 1 AND 12));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chk_overrides_applicable_batch' AND table_name = 'student_timetable_overrides'
  ) THEN
    ALTER TABLE public.student_timetable_overrides 
      ADD CONSTRAINT chk_overrides_applicable_batch 
      CHECK (applicable_batch IS NULL OR applicable_batch IN ('ALL', 'P1', 'P2', 'P3', 'P4', 'T1', 'T2'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_student_timetable_overrides_student 
  ON public.student_timetable_overrides(student_id);

-- 7. Historical Attendance & Audit Protection: Update foreign keys to avoid cascade destruction
DO $$
BEGIN
  -- 7a. Change class_session_id on attendance_records to ON DELETE SET NULL
  ALTER TABLE public.attendance_records ALTER COLUMN class_session_id DROP NOT NULL;
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'attendance_records_class_session_id_fkey'
  ) THEN
    ALTER TABLE public.attendance_records DROP CONSTRAINT attendance_records_class_session_id_fkey;
  END IF;
  ALTER TABLE public.attendance_records 
    ADD CONSTRAINT attendance_records_class_session_id_fkey 
    FOREIGN KEY (class_session_id) REFERENCES public.class_sessions(id) ON DELETE SET NULL;

  -- 7b. Change attendance_record_id on attendance_audit_logs to ON DELETE SET NULL
  ALTER TABLE public.attendance_audit_logs ALTER COLUMN attendance_record_id DROP NOT NULL;
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'attendance_audit_logs_attendance_record_id_fkey'
  ) THEN
    ALTER TABLE public.attendance_audit_logs DROP CONSTRAINT attendance_audit_logs_attendance_record_id_fkey;
  END IF;
  ALTER TABLE public.attendance_audit_logs 
    ADD CONSTRAINT attendance_audit_logs_attendance_record_id_fkey 
    FOREIGN KEY (attendance_record_id) REFERENCES public.attendance_records(id) ON DELETE SET NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_attendance_records_student_date 
  ON public.attendance_records(student_id, session_date);

CREATE INDEX IF NOT EXISTS idx_attendance_records_student_subject 
  ON public.attendance_records(student_id, subject_code);

-- 8. Enable Row Level Security (RLS) on all core tables
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_timetable_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cancellation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 9. Hardened RLS Policies for student_profiles
DROP POLICY IF EXISTS "Students manage their own profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Users read own profile or admin reads all" ON public.student_profiles;
DROP POLICY IF EXISTS "Users update own profile (excluding role)" ON public.student_profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Admins full manage profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "Only admins delete student profiles" ON public.student_profiles;

CREATE POLICY "Users read own profile or admin reads all"
  ON public.student_profiles FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users update own profile"
  ON public.student_profiles FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins full manage profiles"
  ON public.student_profiles FOR ALL
  USING (public.is_admin());

CREATE POLICY "Only admins delete student profiles"
  ON public.student_profiles FOR DELETE
  USING (public.is_admin());

-- 10. Hardened RLS Policies for student_timetable_overrides (Student Personal Timetable)
DROP POLICY IF EXISTS "Students manage their timetable overrides" ON public.student_timetable_overrides;
DROP POLICY IF EXISTS "Students view own timetable overrides" ON public.student_timetable_overrides;
DROP POLICY IF EXISTS "Students insert own timetable overrides" ON public.student_timetable_overrides;
DROP POLICY IF EXISTS "Students update own timetable overrides" ON public.student_timetable_overrides;
DROP POLICY IF EXISTS "Students delete own timetable overrides" ON public.student_timetable_overrides;

CREATE POLICY "Students view own timetable overrides"
  ON public.student_timetable_overrides FOR SELECT
  USING (
    student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid()) OR
    public.is_admin()
  );

CREATE POLICY "Students insert own timetable overrides"
  ON public.student_timetable_overrides FOR INSERT
  WITH CHECK (
    student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid()) OR
    public.is_admin()
  );

CREATE POLICY "Students update own timetable overrides"
  ON public.student_timetable_overrides FOR UPDATE
  USING (
    student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid()) OR
    public.is_admin()
  )
  WITH CHECK (
    student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid()) OR
    public.is_admin()
  );

CREATE POLICY "Students delete own timetable overrides"
  ON public.student_timetable_overrides FOR DELETE
  USING (
    student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid()) OR
    public.is_admin()
  );

-- 11. Official Timetable Policies: Scoped strictly to assigned Branch, Section, Academic Session & Batch
DROP POLICY IF EXISTS "Public read official timetable versions" ON public.timetable_versions;
DROP POLICY IF EXISTS "Admins and CRs manage timetable versions" ON public.timetable_versions;
DROP POLICY IF EXISTS "Public read official timetable slots" ON public.timetable_slots;
DROP POLICY IF EXISTS "Admins and CRs modify timetable slots" ON public.timetable_slots;

CREATE POLICY "Public read official timetable versions"
  ON public.timetable_versions FOR SELECT USING (true);

CREATE POLICY "Admins and CRs manage timetable versions"
  ON public.timetable_versions FOR ALL
  USING (public.is_class_admin_for_section(section_id, academic_session_id))
  WITH CHECK (public.is_class_admin_for_section(section_id, academic_session_id));

CREATE POLICY "Public read official timetable slots" 
  ON public.timetable_slots FOR SELECT USING (true);

CREATE POLICY "Admins and CRs modify timetable slots" 
  ON public.timetable_slots FOR ALL
  USING (public.is_class_admin_for_slot(timetable_version_id, applicable_batch))
  WITH CHECK (public.is_class_admin_for_slot(timetable_version_id, applicable_batch));

-- 12. Type-Safe RLS Policies for attendance_records (Full Student Ownership & Cross-Student Isolation)
DROP POLICY IF EXISTS "Students manage their own attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Students read own attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Students insert own attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Students update own attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Only admins delete attendance records" ON public.attendance_records;
DROP POLICY IF EXISTS "Students delete own attendance" ON public.attendance_records;

CREATE POLICY "Students read own attendance"
  ON public.attendance_records FOR SELECT
  USING (
    student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid()) OR
    public.is_admin()
  );

CREATE POLICY "Students insert own attendance"
  ON public.attendance_records FOR INSERT
  WITH CHECK (
    student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid()) OR
    public.is_admin()
  );

CREATE POLICY "Students update own attendance"
  ON public.attendance_records FOR UPDATE
  USING (
    student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid()) OR
    public.is_admin()
  )
  WITH CHECK (
    student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid()) OR
    public.is_admin()
  );

CREATE POLICY "Students delete own attendance"
  ON public.attendance_records FOR DELETE
  USING (
    student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid()) OR
    public.is_admin()
  );

-- 13. Audit Logs Policies
DROP POLICY IF EXISTS "Students read own audit logs" ON public.attendance_audit_logs;
CREATE POLICY "Students read own audit logs"
  ON public.attendance_audit_logs FOR SELECT
  USING (
    student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid()) OR
    public.is_admin()
  );

-- 14. Push Subscriptions Isolation: Strict ownership mapped to authenticated student
DROP POLICY IF EXISTS "Users manage their own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Students manage own subscriptions" ON public.push_subscriptions;

CREATE POLICY "Students manage own subscriptions"
  ON public.push_subscriptions FOR ALL
  USING (
    student_id IN (
      SELECT id::text FROM public.student_profiles WHERE user_id = auth.uid()
      UNION
      SELECT auth.uid()::text
    ) OR public.is_admin()
  )
  WITH CHECK (
    student_id IN (
      SELECT id::text FROM public.student_profiles WHERE user_id = auth.uid()
      UNION
      SELECT auth.uid()::text
    ) OR public.is_admin()
  );

-- 15. Reference Tables Public Read-Only Policies
DROP POLICY IF EXISTS "Public read official academic sessions" ON public.academic_sessions;
CREATE POLICY "Public read official academic sessions"
  ON public.academic_sessions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public read official batches" ON public.batches;
CREATE POLICY "Public read official batches"
  ON public.batches FOR SELECT
  USING (true);

-- 16. Cancellation Reports Policies (Section Isolation, Student Insert, Admin-Only Mutation)
DROP POLICY IF EXISTS "Students and admins view section cancellation reports" ON public.cancellation_reports;
CREATE POLICY "Students and admins view section cancellation reports"
  ON public.cancellation_reports FOR SELECT
  USING (
    public.is_admin() OR
    (
      auth.role() = 'authenticated' AND
      section_id IN (
        SELECT sp.section_id
        FROM public.student_profiles sp
        WHERE sp.user_id = auth.uid()
          AND sp.is_active = TRUE
          AND sp.status = 'ACTIVE'
      )
    )
  );

DROP POLICY IF EXISTS "Students insert reports for own section" ON public.cancellation_reports;
CREATE POLICY "Students insert reports for own section"
  ON public.cancellation_reports FOR INSERT
  WITH CHECK (
    public.is_admin() OR
    (
      auth.role() = 'authenticated' AND
      (status IS NULL OR status = 'PENDING') AND
      confirmed_by IS NULL AND
      EXISTS (
        SELECT 1
        FROM public.student_profiles sp
        JOIN public.sections s ON s.id = cancellation_reports.section_id
        JOIN public.branches b ON b.id = s.branch_id
        WHERE sp.user_id = auth.uid()
          AND sp.id = cancellation_reports.reported_by_student_id
          AND sp.section_id = s.id
          AND sp.branch_id = b.id
          AND sp.university_id = b.university_id
          AND sp.is_active = TRUE
          AND sp.status = 'ACTIVE'
      )
    )
  );

DROP POLICY IF EXISTS "Only admins update cancellation reports" ON public.cancellation_reports;
CREATE POLICY "Only admins update cancellation reports"
  ON public.cancellation_reports FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Only admins delete cancellation reports" ON public.cancellation_reports;
CREATE POLICY "Only admins delete cancellation reports"
  ON public.cancellation_reports FOR DELETE
  USING (public.is_admin());
