-- ====================================================================
-- AttendX: Smart Student Attendance Management System Schema
-- Madan Mohan Malaviya University of Technology (MMMUT), Gorakhpur
-- ====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. UNIVERSITIES TABLE
CREATE TABLE IF NOT EXISTS universities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(50) NOT NULL UNIQUE,
    location VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ACADEMIC SESSIONS TABLE
CREATE TABLE IF NOT EXISTS academic_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    university_id UUID REFERENCES universities(id) ON DELETE CASCADE,
    session_name VARCHAR(50) NOT NULL, -- e.g. "2025-26", "2026-27"
    year_name VARCHAR(50) NOT NULL,    -- e.g. "First Year"
    semester_name VARCHAR(50) NOT NULL, -- e.g. "Semester I"
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. BRANCHES TABLE
CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    university_id UUID REFERENCES universities(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL, -- e.g. "CSE", "IT", "CE", "EE", "ME", "ECE", "CHE", "BBA", "PHARM"
    degree VARCHAR(50) NOT NULL, -- "B.Tech", "BBA", "B.Pharm"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. SECTIONS TABLE
CREATE TABLE IF NOT EXISTS sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    section_name VARCHAR(50) NOT NULL, -- "SEC-A", "SEC-B", "SEC-C", "SEC-D"
    default_room VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. BATCHES TABLE
CREATE TABLE IF NOT EXISTS batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
    batch_name VARCHAR(50) NOT NULL, -- "P1", "P2", "P3", "P4", "T1", "T2"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. SUBJECTS TABLE
CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    credits VARCHAR(50), -- e.g. "3-1-0", "3-0-2", "2-0-4"
    has_theory BOOLEAN DEFAULT TRUE,
    has_lab BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. TIMETABLE VERSIONS (Central Official & Student Personalized)
CREATE TABLE IF NOT EXISTS timetable_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
    academic_session_id UUID REFERENCES academic_sessions(id) ON DELETE CASCADE,
    version_label VARCHAR(50) NOT NULL DEFAULT 'V1.0',
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(100) DEFAULT 'ADMIN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. TIMETABLE SLOTS TABLE
CREATE TABLE IF NOT EXISTS timetable_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timetable_version_id UUID REFERENCES timetable_versions(id) ON DELETE CASCADE,
    day_of_week VARCHAR(20) NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
    period_number INT NOT NULL CHECK (period_number BETWEEN 1 AND 12),
    subject_code VARCHAR(50) NOT NULL,
    subject_name VARCHAR(255) NOT NULL,
    category VARCHAR(20) NOT NULL CHECK (category IN ('Theory', 'Lab', 'Tutorial')),
    applicable_batch VARCHAR(20) NOT NULL DEFAULT 'ALL' CHECK (applicable_batch IN ('ALL', 'P1', 'P2', 'P3', 'P4', 'T1', 'T2')),
    room VARCHAR(50),
    faculty VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. STUDENT PROFILES TABLE
CREATE TABLE IF NOT EXISTS student_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE, -- References auth.users(id)
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'class_admin', 'admin')),
    managed_branch_code VARCHAR(50),
    managed_section VARCHAR(50),
    managed_batch VARCHAR(20),
    academic_session_id UUID REFERENCES academic_sessions(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ALUMNI', 'TRANSFERRED', 'WITHDRAWN', 'SUSPENDED')),
    deactivated_at TIMESTAMP WITH TIME ZONE,
    deactivation_reason TEXT,
    university_id UUID REFERENCES universities(id),
    branch_id UUID REFERENCES branches(id),
    section_id UUID REFERENCES sections(id),
    batch VARCHAR(20) NOT NULL DEFAULT 'P1',
    semester VARCHAR(50) NOT NULL DEFAULT 'Semester I',
    academic_session VARCHAR(50) NOT NULL DEFAULT '2025-26',
    attendance_threshold NUMERIC(5, 2) DEFAULT 75.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. STUDENT TIMETABLE OVERRIDES (Personalized modifications)
CREATE TABLE IF NOT EXISTS student_timetable_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    timetable_slot_id UUID REFERENCES timetable_slots(id) ON DELETE SET NULL,
    day_of_week VARCHAR(20) CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
    period_number INT CHECK (period_number BETWEEN 1 AND 12),
    subject_code VARCHAR(50) NOT NULL,
    subject_name VARCHAR(255) NOT NULL,
    category VARCHAR(20) NOT NULL CHECK (category IN ('Theory', 'Lab', 'Tutorial')),
    applicable_batch VARCHAR(20) DEFAULT 'ALL' CHECK (applicable_batch IN ('ALL', 'P1', 'P2', 'P3', 'P4', 'T1', 'T2')),
    room VARCHAR(50),
    faculty VARCHAR(255),
    custom_start_time TIME,
    custom_end_time TIME,
    is_excluded BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_overrides_custom_times CHECK (custom_start_time IS NULL OR custom_end_time IS NULL OR custom_start_time < custom_end_time)
);

-- 11. CLASS SESSIONS TABLE (Daily actual scheduled periods)
CREATE TABLE IF NOT EXISTS class_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    period_number INT NOT NULL,
    subject_code VARCHAR(50) NOT NULL,
    subject_name VARCHAR(255) NOT NULL,
    category VARCHAR(20) NOT NULL CHECK (category IN ('Theory', 'Lab', 'Tutorial')),
    applicable_batch VARCHAR(20) NOT NULL DEFAULT 'ALL',
    room VARCHAR(50),
    faculty VARCHAR(255),
    is_cancelled BOOLEAN DEFAULT FALSE,
    cancellation_reason VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_section_date_period_batch UNIQUE (section_id, session_date, period_number, applicable_batch, subject_code)
);

-- 12. ATTENDANCE RECORDS TABLE (Historical Academic Records - RESTRICT prevents accidental destruction)
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE RESTRICT,
    class_session_id UUID REFERENCES class_sessions(id) ON DELETE SET NULL,
    session_date DATE NOT NULL,
    period_number INT NOT NULL,
    subject_code VARCHAR(50) NOT NULL,
    category VARCHAR(20) NOT NULL CHECK (category IN ('Theory', 'Lab', 'Tutorial')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('PRESENT', 'ABSENT', 'CANCELLED', 'PENDING')),
    marked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    marked_by VARCHAR(50) DEFAULT 'STUDENT', -- 'STUDENT', 'AUTO_ABSENCE', 'ADMIN_OVERRIDE'
    CONSTRAINT unique_student_session UNIQUE (student_id, class_session_id)
);

-- 13. CANCELLATION REPORTS TABLE (Mass bunk / teacher absent reports)
CREATE TABLE IF NOT EXISTS cancellation_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reported_by_student_id UUID REFERENCES student_profiles(id),
    section_id UUID REFERENCES sections(id),
    session_date DATE NOT NULL,
    period_number INT, -- NULL if entire day
    subject_code VARCHAR(50),
    reason_type VARCHAR(50) NOT NULL, -- 'MASS_BUNK', 'TEACHER_ABSENT', 'COLLEGE_HOLIDAY', 'OTHER'
    description TEXT,
    confirmation_count INT DEFAULT 1,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'REJECTED')),
    confirmed_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. ATTENDANCE AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS attendance_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attendance_record_id UUID REFERENCES attendance_records(id) ON DELETE SET NULL,
    student_id UUID REFERENCES student_profiles(id),
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    reason VARCHAR(255),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES student_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'WARNING', 'SUCCESS', 'INFO', 'TIMETABLE_CHANGE'
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. PUSH SUBSCRIPTIONS TABLE (Web Push Notification Subscriptions)
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id VARCHAR(100) NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) & AUTHORIZATION
-- ====================================================================

-- Security Definer role check functions
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

-- Anti-tampering triggers for student profiles
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
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
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Access Denied: Only administrators can assign or alter roles.';
    END IF;
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Access Denied: user_id is immutable.';
    END IF;
    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Access Denied: Profile ID is immutable.';
    END IF;
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Access Denied: created_at timestamp is immutable.';
    END IF;
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
    IF NEW.managed_branch_code IS DISTINCT FROM OLD.managed_branch_code OR
       NEW.managed_section IS DISTINCT FROM OLD.managed_section OR
       NEW.managed_batch IS DISTINCT FROM OLD.managed_batch THEN
      RAISE EXCEPTION 'Access Denied: Class CR management scope can only be assigned by an administrator.';
    END IF;
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

-- Enable RLS on core tables
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_timetable_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancellation_reports ENABLE ROW LEVEL SECURITY;

-- 1. Student Profiles Policies
DROP POLICY IF EXISTS "Users read own profile or admin reads all" ON student_profiles;
CREATE POLICY "Users read own profile or admin reads all"
  ON student_profiles FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users update own profile" ON student_profiles;
CREATE POLICY "Users update own profile"
  ON student_profiles FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins full manage profiles" ON student_profiles;
CREATE POLICY "Admins full manage profiles"
  ON student_profiles FOR ALL
  USING (public.is_admin());

DROP POLICY IF EXISTS "Only admins delete student profiles" ON student_profiles;
CREATE POLICY "Only admins delete student profiles"
  ON student_profiles FOR DELETE
  USING (public.is_admin());

-- 2. Student Personal Timetable Overrides Policies
DROP POLICY IF EXISTS "Students view own timetable overrides" ON student_timetable_overrides;
CREATE POLICY "Students view own timetable overrides"
  ON student_timetable_overrides FOR SELECT
  USING (
    student_id IN (SELECT id FROM student_profiles WHERE user_id = auth.uid()) OR
    public.is_admin()
  );

DROP POLICY IF EXISTS "Students insert own timetable overrides" ON student_timetable_overrides;
CREATE POLICY "Students insert own timetable overrides"
  ON student_timetable_overrides FOR INSERT
  WITH CHECK (
    student_id IN (SELECT id FROM student_profiles WHERE user_id = auth.uid()) OR
    public.is_admin()
  );

DROP POLICY IF EXISTS "Students update own timetable overrides" ON student_timetable_overrides;
CREATE POLICY "Students update own timetable overrides"
  ON student_timetable_overrides FOR UPDATE
  USING (
    student_id IN (SELECT id FROM student_profiles WHERE user_id = auth.uid()) OR
    public.is_admin()
  )
  WITH CHECK (
    student_id IN (SELECT id FROM student_profiles WHERE user_id = auth.uid()) OR
    public.is_admin()
  );

DROP POLICY IF EXISTS "Students delete own timetable overrides" ON student_timetable_overrides;
CREATE POLICY "Students delete own timetable overrides"
  ON student_timetable_overrides FOR DELETE
  USING (
    student_id IN (SELECT id FROM student_profiles WHERE user_id = auth.uid()) OR
    public.is_admin()
  );

-- 3. Official Timetable Versions & Slots Policies (Scoped to Class CR with Academic Session & Batch)
DROP POLICY IF EXISTS "Public read official timetable versions" ON timetable_versions;
CREATE POLICY "Public read official timetable versions"
  ON timetable_versions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins and CRs manage timetable versions" ON timetable_versions;
CREATE POLICY "Admins and CRs manage timetable versions"
  ON timetable_versions FOR ALL
  USING (public.is_class_admin_for_section(section_id, academic_session_id))
  WITH CHECK (public.is_class_admin_for_section(section_id, academic_session_id));

DROP POLICY IF EXISTS "Public read official timetable slots" ON timetable_slots;
CREATE POLICY "Public read official timetable slots" 
  ON timetable_slots FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins and CRs modify timetable slots" ON timetable_slots;
CREATE POLICY "Admins and CRs modify timetable slots" 
  ON timetable_slots FOR ALL
  USING (public.is_class_admin_for_slot(timetable_version_id, applicable_batch))
  WITH CHECK (public.is_class_admin_for_slot(timetable_version_id, applicable_batch));

-- 4. Attendance Records Policies (Type-Safe UUID Ownership)
DROP POLICY IF EXISTS "Students read own attendance" ON attendance_records;
CREATE POLICY "Students read own attendance"
  ON attendance_records FOR SELECT
  USING (
    student_id IN (SELECT id FROM student_profiles WHERE user_id = auth.uid()) OR
    public.is_admin()
  );

DROP POLICY IF EXISTS "Students insert own attendance" ON attendance_records;
CREATE POLICY "Students insert own attendance"
  ON attendance_records FOR INSERT
  WITH CHECK (
    student_id IN (SELECT id FROM student_profiles WHERE user_id = auth.uid()) OR
    public.is_admin()
  );

DROP POLICY IF EXISTS "Students update own attendance" ON attendance_records;
CREATE POLICY "Students update own attendance"
  ON attendance_records FOR UPDATE
  USING (
    student_id IN (SELECT id FROM student_profiles WHERE user_id = auth.uid()) OR
    public.is_admin()
  )
  WITH CHECK (
    student_id IN (SELECT id FROM student_profiles WHERE user_id = auth.uid()) OR
    public.is_admin()
  );

DROP POLICY IF EXISTS "Students delete own attendance" ON attendance_records;
CREATE POLICY "Students delete own attendance"
  ON attendance_records FOR DELETE
  USING (
    student_id IN (SELECT id FROM student_profiles WHERE user_id = auth.uid()) OR
    public.is_admin()
  );

-- 5. Audit Logs Policies
DROP POLICY IF EXISTS "Students read own audit logs" ON attendance_audit_logs;
CREATE POLICY "Students read own audit logs"
  ON attendance_audit_logs FOR SELECT
  USING (
    student_id IN (SELECT id FROM student_profiles WHERE user_id = auth.uid()) OR
    public.is_admin()
  );

-- 6. Push Subscriptions Policies
DROP POLICY IF EXISTS "Students manage own subscriptions" ON push_subscriptions;
CREATE POLICY "Students manage own subscriptions"
  ON push_subscriptions FOR ALL
  USING (
    student_id IN (
      SELECT id::text FROM student_profiles WHERE user_id = auth.uid()
      UNION
      SELECT auth.uid()::text
    ) OR public.is_admin()
  )
  WITH CHECK (
    student_id IN (
      SELECT id::text FROM student_profiles WHERE user_id = auth.uid()
      UNION
      SELECT auth.uid()::text
    ) OR public.is_admin()
  );

-- 7. Notifications & Public Reference Read Policies
DROP POLICY IF EXISTS "Students manage their notifications" ON notifications;
CREATE POLICY "Students manage their notifications"
  ON notifications FOR ALL
  USING (student_id IN (SELECT id FROM student_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Public read official universities" ON universities;
CREATE POLICY "Public read official universities" ON universities FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read official academic sessions" ON academic_sessions;
CREATE POLICY "Public read official academic sessions" ON academic_sessions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read official branches" ON branches;
CREATE POLICY "Public read official branches" ON branches FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read official sections" ON sections;
CREATE POLICY "Public read official sections" ON sections FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read official batches" ON batches;
CREATE POLICY "Public read official batches" ON batches FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read official subjects" ON subjects;
CREATE POLICY "Public read official subjects" ON subjects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read official class sessions" ON class_sessions;
CREATE POLICY "Public read official class sessions" ON class_sessions FOR SELECT USING (true);

-- 8. Cancellation Reports Policies (Section Isolation, Student Insert, Admin-Only Mutation)
DROP POLICY IF EXISTS "Students and admins view section cancellation reports" ON cancellation_reports;
CREATE POLICY "Students and admins view section cancellation reports"
  ON cancellation_reports FOR SELECT
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

DROP POLICY IF EXISTS "Students insert reports for own section" ON cancellation_reports;
CREATE POLICY "Students insert reports for own section"
  ON cancellation_reports FOR INSERT
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

DROP POLICY IF EXISTS "Only admins update cancellation reports" ON cancellation_reports;
CREATE POLICY "Only admins update cancellation reports"
  ON cancellation_reports FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Only admins delete cancellation reports" ON cancellation_reports;
CREATE POLICY "Only admins delete cancellation reports"
  ON cancellation_reports FOR DELETE
  USING (public.is_admin());
