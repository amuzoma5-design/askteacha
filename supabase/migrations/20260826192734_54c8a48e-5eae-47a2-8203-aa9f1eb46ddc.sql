-- ENUMS
CREATE TYPE public.app_role AS ENUM ('student','admin');
CREATE TYPE public.app_plan AS ENUM ('trial','free','foundation','scholar','achiever');
CREATE TYPE public.sub_status AS ENUM ('active','expired','cancelled');
CREATE TYPE public.request_status AS ENUM ('pending','approved','rejected','expired');

-- STUDENT CODE SEQUENCE
CREATE SEQUENCE public.student_code_seq START 1001;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  student_code TEXT NOT NULL UNIQUE DEFAULT ('AT-' || nextval('public.student_code_seq')),
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  class_level TEXT NOT NULL DEFAULT 'SS3',
  exam_type TEXT NOT NULL DEFAULT 'WAEC',
  subjects TEXT[] NOT NULL DEFAULT '{}',
  strong_subjects TEXT[] NOT NULL DEFAULT '{}',
  weak_subjects TEXT[] NOT NULL DEFAULT '{}',
  career_goal TEXT,
  target_score TEXT,
  exam_date DATE,
  learning_style TEXT,
  notes TEXT,
  plan public.app_plan NOT NULL DEFAULT 'trial',
  trial_start_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  trial_expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '14 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- PROFILE POLICIES
CREATE POLICY "read own profile" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Students may not change plan/trial/code fields themselves.
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(),'admin') OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  NEW.plan := OLD.plan;
  NEW.trial_start_at := OLD.trial_start_at;
  NEW.trial_expires_at := OLD.trial_expires_at;
  NEW.student_code := OLD.student_code;
  RETURN NEW;
END; $$;
CREATE TRIGGER protect_profile_fields_trg BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- NEW USER TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, class_level, exam_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'class_level','SS3'),
    COALESCE(NEW.raw_user_meta_data->>'exam_type','WAEC')
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id,'student')
    ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- SUBSCRIPTIONS
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan public.app_plan NOT NULL DEFAULT 'foundation',
  status public.sub_status NOT NULL DEFAULT 'active',
  amount INTEGER NOT NULL DEFAULT 2000,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by UUID
);
CREATE INDEX subscriptions_user_idx ON public.subscriptions(user_id, status);
CREATE UNIQUE INDEX subscriptions_one_active ON public.subscriptions(user_id) WHERE status = 'active';
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own subscriptions" ON public.subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- UPGRADE REQUESTS
CREATE TABLE public.upgrade_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan public.app_plan NOT NULL DEFAULT 'foundation',
  amount INTEGER NOT NULL DEFAULT 2000,
  status public.request_status NOT NULL DEFAULT 'pending',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  subscription_start_at TIMESTAMPTZ,
  subscription_expires_at TIMESTAMPTZ
);
CREATE INDEX upgrade_requests_status_idx ON public.upgrade_requests(status, created_at DESC);
CREATE UNIQUE INDEX upgrade_requests_one_pending ON public.upgrade_requests(user_id) WHERE status = 'pending';
GRANT SELECT ON public.upgrade_requests TO authenticated;
GRANT ALL ON public.upgrade_requests TO service_role;
ALTER TABLE public.upgrade_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own requests" ON public.upgrade_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ADMIN ACTION LOG
CREATE TABLE public.admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  action TEXT NOT NULL,
  detail JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_actions TO authenticated;
GRANT ALL ON public.admin_actions TO service_role;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read actions" ON public.admin_actions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- USAGE EVENTS (free plan limits)
CREATE TABLE public.usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX usage_events_lookup ON public.usage_events(user_id, feature, created_at DESC);
GRANT SELECT ON public.usage_events TO authenticated;
GRANT ALL ON public.usage_events TO service_role;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own usage" ON public.usage_events FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- LEARNING DATA
CREATE TABLE public.question_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_id TEXT,
  question TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT 'General',
  answer JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, local_id)
);
CREATE INDEX question_history_user_idx ON public.question_history(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_history TO authenticated;
GRANT ALL ON public.question_history TO service_role;
ALTER TABLE public.question_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own history" ON public.question_history FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "admins read history" ON public.question_history FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.notebook_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_id TEXT,
  question TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT 'General',
  key_mistake TEXT,
  answer JSONB NOT NULL DEFAULT '{}',
  revised BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, local_id)
);
CREATE INDEX notebook_entries_user_idx ON public.notebook_entries(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notebook_entries TO authenticated;
GRANT ALL ON public.notebook_entries TO service_role;
ALTER TABLE public.notebook_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notebook" ON public.notebook_entries FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "admins read notebook" ON public.notebook_entries FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.cbt_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL DEFAULT 'General',
  total INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX cbt_results_user_idx ON public.cbt_results(user_id, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.cbt_results TO authenticated;
GRANT ALL ON public.cbt_results TO service_role;
ALTER TABLE public.cbt_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cbt results" ON public.cbt_results FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "admins read cbt results" ON public.cbt_results FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- EFFECTIVE PLAN: single source of truth, computed server-side.
CREATE OR REPLACE FUNCTION public.effective_plan(_user_id UUID)
RETURNS public.app_plan LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.profiles%ROWTYPE; s public.subscriptions%ROWTYPE;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = _user_id;
  IF NOT FOUND THEN RETURN 'free'; END IF;
  SELECT * INTO s FROM public.subscriptions
    WHERE user_id = _user_id AND status = 'active' AND expires_at > now()
    ORDER BY expires_at DESC LIMIT 1;
  IF FOUND THEN RETURN s.plan; END IF;
  IF p.trial_expires_at > now() AND p.plan = 'trial' THEN RETURN 'trial'; END IF;
  RETURN 'free';
END; $$;

-- Reconcile stored plan + expire stale subscriptions/requests for one user.
CREATE OR REPLACE FUNCTION public.sync_access_state(_user_id UUID)
RETURNS public.app_plan LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE eff public.app_plan;
BEGIN
  UPDATE public.subscriptions SET status = 'expired'
    WHERE user_id = _user_id AND status = 'active' AND expires_at <= now();
  eff := public.effective_plan(_user_id);
  UPDATE public.profiles SET plan = eff WHERE id = _user_id AND plan IS DISTINCT FROM eff;
  RETURN eff;
END; $$;