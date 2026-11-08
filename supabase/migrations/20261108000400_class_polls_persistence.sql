-- ====================================================================
-- AttendX Migration: Production Class Polls Persistence Architecture
-- Tables: public.class_polls, public.class_poll_options, public.class_poll_votes
-- Features: Atomic duplicate vote prevention, composite foreign keys,
--           strict Row-Level Security, and atomic voting/creation RPCs.
-- ====================================================================

-- 1. Create class_polls table
CREATE TABLE IF NOT EXISTS public.class_polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN ('MASS_BUNK', 'RESCHEDULE', 'EXTRA_CLASS', 'GENERAL')),
    branch_code VARCHAR(50) NOT NULL,
    section VARCHAR(50) NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- 2. Create class_poll_options table with composite unique constraint for relational binding
CREATE TABLE IF NOT EXISTS public.class_poll_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES public.class_polls(id) ON DELETE CASCADE,
    option_text VARCHAR(255) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_class_poll_option_id_poll_id UNIQUE (id, poll_id)
);

-- 3. Create class_poll_votes table with atomic duplicate prevention and composite foreign key
CREATE TABLE IF NOT EXISTS public.class_poll_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES public.class_polls(id) ON DELETE CASCADE,
    option_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    voted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    -- Atomic duplicate vote prevention at database engine level
    CONSTRAINT uq_class_poll_user_vote UNIQUE (poll_id, user_id),
    -- Composite foreign key guarantees option belongs strictly to the targeted poll
    CONSTRAINT fk_vote_option_poll FOREIGN KEY (option_id, poll_id) 
        REFERENCES public.class_poll_options(id, poll_id) ON DELETE CASCADE
);

-- 4. Performance & Scoping Indexes
CREATE INDEX IF NOT EXISTS idx_class_polls_scope_status ON public.class_polls (branch_code, section, status);
CREATE INDEX IF NOT EXISTS idx_class_polls_created_by ON public.class_polls (created_by);
CREATE INDEX IF NOT EXISTS idx_class_poll_options_poll_id ON public.class_poll_options (poll_id);
CREATE INDEX IF NOT EXISTS idx_class_poll_votes_poll_id ON public.class_poll_votes (poll_id);
CREATE INDEX IF NOT EXISTS idx_class_poll_votes_user_id ON public.class_poll_votes (user_id);

-- 5. Scope Resolution Helper Functions (SECURITY DEFINER with immutable search_path)
CREATE OR REPLACE FUNCTION public.get_auth_branch_code()
RETURNS VARCHAR(50) AS $$
  SELECT COALESCE(
    (SELECT managed_branch_code FROM public.student_profiles WHERE user_id = auth.uid() AND managed_branch_code IS NOT NULL LIMIT 1),
    (SELECT b.code FROM public.student_profiles sp JOIN public.branches b ON b.id = sp.branch_id WHERE sp.user_id = auth.uid() LIMIT 1),
    'IT'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.get_auth_section()
RETURNS VARCHAR(50) AS $$
  SELECT COALESCE(
    (SELECT managed_section FROM public.student_profiles WHERE user_id = auth.uid() AND managed_section IS NOT NULL LIMIT 1),
    (SELECT s.section_name FROM public.student_profiles sp JOIN public.sections s ON s.id = sp.section_id WHERE sp.user_id = auth.uid() LIMIT 1),
    'SEC-B'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.can_view_poll(p_branch_code VARCHAR(50), p_section VARCHAR(50))
RETURNS BOOLEAN AS $$
  SELECT public.is_admin() OR 
         p_branch_code = 'ALL' OR 
         (p_branch_code = public.get_auth_branch_code() AND (p_section = 'ALL' OR p_section = public.get_auth_section()));
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.can_manage_poll(p_branch_code VARCHAR(50), p_section VARCHAR(50))
RETURNS BOOLEAN AS $$
  SELECT public.is_admin() OR (
    public.get_auth_role() = 'class_admin' AND
    p_branch_code = public.get_auth_branch_code() AND
    (p_section = 'ALL' OR p_section = public.get_auth_section())
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.can_create_poll(p_branch_code VARCHAR(50), p_section VARCHAR(50))
RETURNS BOOLEAN AS $$
  SELECT public.is_admin() OR (
    public.get_auth_role() = 'class_admin' AND
    p_branch_code != 'ALL' AND
    p_section != 'ALL' AND
    p_branch_code = public.get_auth_branch_code() AND
    p_section = public.get_auth_section()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- 6. Enable Row-Level Security
ALTER TABLE public.class_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_poll_votes ENABLE ROW LEVEL SECURITY;

-- 7. Drop existing policies idempotently
DROP POLICY IF EXISTS "class_polls_select_policy" ON public.class_polls;
DROP POLICY IF EXISTS "class_polls_insert_policy" ON public.class_polls;
DROP POLICY IF EXISTS "class_polls_update_policy" ON public.class_polls;
DROP POLICY IF EXISTS "class_polls_delete_policy" ON public.class_polls;

DROP POLICY IF EXISTS "class_poll_options_select_policy" ON public.class_poll_options;
DROP POLICY IF EXISTS "class_poll_options_insert_policy" ON public.class_poll_options;
DROP POLICY IF EXISTS "class_poll_options_update_policy" ON public.class_poll_options;
DROP POLICY IF EXISTS "class_poll_options_delete_policy" ON public.class_poll_options;

DROP POLICY IF EXISTS "class_poll_votes_select_policy" ON public.class_poll_votes;
DROP POLICY IF EXISTS "class_poll_votes_insert_policy" ON public.class_poll_votes;
DROP POLICY IF EXISTS "class_poll_votes_update_policy" ON public.class_poll_votes;
DROP POLICY IF EXISTS "class_poll_votes_delete_policy" ON public.class_poll_votes;

-- 8. Policies for class_polls
CREATE POLICY "class_polls_select_policy" ON public.class_polls
  FOR SELECT USING (public.can_view_poll(branch_code, section));

CREATE POLICY "class_polls_insert_policy" ON public.class_polls
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND 
    public.can_create_poll(branch_code, section)
  );

CREATE POLICY "class_polls_update_policy" ON public.class_polls
  FOR UPDATE USING (public.can_manage_poll(branch_code, section))
  WITH CHECK (public.can_manage_poll(branch_code, section));

CREATE POLICY "class_polls_delete_policy" ON public.class_polls
  FOR DELETE USING (public.is_admin());

-- 9. Policies for class_poll_options
CREATE POLICY "class_poll_options_select_policy" ON public.class_poll_options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.class_polls cp 
      WHERE cp.id = poll_id AND public.can_view_poll(cp.branch_code, cp.section)
    )
  );

CREATE POLICY "class_poll_options_insert_policy" ON public.class_poll_options
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.class_polls cp 
      WHERE cp.id = poll_id AND (
        public.is_admin() OR (auth.uid() = cp.created_by AND public.can_manage_poll(cp.branch_code, cp.section))
      )
    )
  );

CREATE POLICY "class_poll_options_update_policy" ON public.class_poll_options
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.class_polls cp 
      WHERE cp.id = poll_id AND public.can_manage_poll(cp.branch_code, cp.section)
    )
  );

CREATE POLICY "class_poll_options_delete_policy" ON public.class_poll_options
  FOR DELETE USING (public.is_admin());

-- 10. Policies for class_poll_votes
CREATE POLICY "class_poll_votes_select_policy" ON public.class_poll_votes
  FOR SELECT USING (
    auth.uid() = user_id OR
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.class_polls cp 
      WHERE cp.id = poll_id AND public.can_view_poll(cp.branch_code, cp.section)
    )
  );

CREATE POLICY "class_poll_votes_insert_policy" ON public.class_poll_votes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.class_polls cp 
      WHERE cp.id = poll_id 
        AND cp.status = 'ACTIVE' 
        AND public.can_view_poll(cp.branch_code, cp.section)
    )
  );

-- Votes are immutable; cannot be updated once recorded
CREATE POLICY "class_poll_votes_update_policy" ON public.class_poll_votes
  FOR UPDATE USING (FALSE);

CREATE POLICY "class_poll_votes_delete_policy" ON public.class_poll_votes
  FOR DELETE USING (public.is_admin());

-- 11. Atomic Database Transaction RPC: cast_poll_vote_atomic
CREATE OR REPLACE FUNCTION public.cast_poll_vote_atomic(
    p_poll_id UUID,
    p_option_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_poll public.class_polls%ROWTYPE;
    v_auth_uid UUID;
    v_new_vote_id UUID;
    v_total_votes BIGINT;
    v_option_votes BIGINT;
BEGIN
    v_auth_uid := auth.uid();
    IF v_auth_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required to cast vote.' USING ERRCODE = '42501';
    END IF;

    -- Retrieve poll with lock
    SELECT * INTO v_poll 
    FROM public.class_polls 
    WHERE id = p_poll_id 
    FOR SHARE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target poll not found.' USING ERRCODE = 'P0002';
    END IF;

    IF v_poll.status = 'CLOSED' THEN
        RAISE EXCEPTION 'This poll is closed for voting.' USING ERRCODE = '22000';
    END IF;

    -- Scope check
    IF NOT public.can_view_poll(v_poll.branch_code, v_poll.section) THEN
        RAISE EXCEPTION 'Access Denied: You cannot vote in polls outside your authorized branch and section.' USING ERRCODE = '42501';
    END IF;

    -- Verify option exists and belongs to this poll
    IF NOT EXISTS (SELECT 1 FROM public.class_poll_options WHERE id = p_option_id AND poll_id = p_poll_id) THEN
        RAISE EXCEPTION 'Invalid option selected for this poll.' USING ERRCODE = '22023';
    END IF;

    -- Insert vote (uq_class_poll_user_vote will raise 23505 if already voted)
    INSERT INTO public.class_poll_votes (poll_id, option_id, user_id)
    VALUES (p_poll_id, p_option_id, v_auth_uid)
    RETURNING id INTO v_new_vote_id;

    -- Aggregate updated totals
    SELECT COUNT(*) INTO v_total_votes FROM public.class_poll_votes WHERE poll_id = p_poll_id;
    SELECT COUNT(*) INTO v_option_votes FROM public.class_poll_votes WHERE option_id = p_option_id;

    RETURN jsonb_build_object(
        'success', true,
        'poll_id', p_poll_id,
        'option_id', p_option_id,
        'vote_id', v_new_vote_id,
        'total_votes', v_total_votes,
        'option_votes', v_option_votes
    );
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'You have already cast your vote in this poll.' USING ERRCODE = '23505';
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp;

-- 12. Atomic Database Transaction RPC: create_class_poll_atomic
CREATE OR REPLACE FUNCTION public.create_class_poll_atomic(
    p_title VARCHAR(255),
    p_description TEXT,
    p_category VARCHAR(50),
    p_branch_code VARCHAR(50),
    p_section VARCHAR(50),
    p_options TEXT[]
)
RETURNS JSONB AS $$
DECLARE
    v_auth_uid UUID;
    v_poll_id UUID;
    v_opt_text TEXT;
    v_sort INT := 0;
    v_created_poll RECORD;
BEGIN
    v_auth_uid := auth.uid();
    IF v_auth_uid IS NULL THEN
        RAISE EXCEPTION 'Authentication required to create a poll.' USING ERRCODE = '42501';
    END IF;

    IF NOT public.can_create_poll(p_branch_code, p_section) THEN
        RAISE EXCEPTION 'Access Denied: You are not authorized to create a poll for % %.', p_branch_code, p_section USING ERRCODE = '42501';
    END IF;

    IF array_length(p_options, 1) IS NULL OR array_length(p_options, 1) < 2 THEN
        RAISE EXCEPTION 'Poll must contain at least 2 options.' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.class_polls (
        title, description, category, branch_code, section, created_by, status
    ) VALUES (
        p_title, p_description, p_category, p_branch_code, p_section, v_auth_uid, 'ACTIVE'
    ) RETURNING id INTO v_poll_id;

    FOREACH v_opt_text IN ARRAY p_options
    LOOP
        INSERT INTO public.class_poll_options (poll_id, option_text, sort_order)
        VALUES (v_poll_id, trim(v_opt_text), v_sort);
        v_sort := v_sort + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'poll_id', v_poll_id,
        'title', p_title,
        'branch_code', p_branch_code,
        'section', p_section,
        'options_count', v_sort
    );
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp;
