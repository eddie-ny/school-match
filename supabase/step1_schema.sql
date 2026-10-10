-- =====================================================================
-- STEP 1: Database and security  (run in Supabase > SQL Editor)
-- Run the whole file once. It is written to be safe to read top to bottom:
--   1. tables  2. helper functions  3. signup trigger  4. row-level security
--   5. summary views  6. storage bucket for documents
-- NOT included on purpose: application requests (feature removed), SMS verification,
-- seed data (step 5), payments webhook (step 6).
-- =====================================================================

-- ---------- 1. TABLES ----------

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  phone_verified boolean not null default false,   -- stays false until SMS is added
  date_of_birth date,
  is_minor boolean not null default false,
  shs_attended text,
  shs_program text,
  funding_type text check (funding_type in ('Self-funded','Partial funding','Fully funded')),
  desired_programs text,
  trial_ends_at timestamptz,                       -- null = no trial granted
  profile_complete boolean generated always as (
    coalesce(shs_attended,'') <> '' and coalesce(shs_program,'') <> ''
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.parent_contacts (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  name text not null,
  phone text,
  email text not null,
  confirm_token uuid not null default gen_random_uuid(),  -- never readable by the student
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.results (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('final','terminal')),
  exam text not null default 'WASSCE' check (exam in ('WASSCE','SAT','other')),
  year int,
  sat_score int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- one set of results per student and exam
create unique index results_one_per_exam on public.results (student_id, exam);

create table public.result_grades (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.results(id) on delete cascade,
  subject text not null,
  subject_type text not null check (subject_type in ('core','elective')),
  grade text not null check (grade in ('A1','B2','B3','C4','C5','C6','D7','E8','F9')),
  unique (result_id, subject)
);

-- Blocks repeat trials by phone number. Weak until phones are verified by SMS.
create table public.trial_ledger (
  phone_hash text primary key,
  user_id uuid references auth.users(id) on delete set null,
  started_at timestamptz not null default now()
);

create table public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null check (plan in ('1m','3m','6m','1y')),
  status text not null default 'active' check (status in ('active','canceled','expired')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  auto_renew boolean not null default false,
  paystack_ref text,
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'paystack',
  reference text not null unique,
  amount_usd numeric(10,2),
  status text not null,
  created_at timestamptz not null default now()
);

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null,
  type text,
  category text,
  city text,
  website text,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  level text,
  field text,
  fees_usd numeric(10,2),
  duration_years numeric(3,1),
  english_test_waiver boolean not null default false,
  foundation_available boolean not null default false,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.program_requirements (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  subject text not null,
  min_grade text check (min_grade in ('A1','B2','B3','C4','C5','C6','D7','E8','F9')),  -- null = must have taken it
  is_core boolean not null default false
);

create table public.program_cutoffs (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  year int not null,
  cutoff_aggregate int,
  sat_low int,
  sat_high int,
  unique (program_id, year)
);

create table public.scholarships (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  funder text,
  country text,
  funding_type text not null check (funding_type in ('Full','Partial')),
  level text,
  min_aggregate int,
  min_sat int,
  criteria text,
  deadline date,
  link text,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  doc_type text,
  file_path text not null,          -- path inside the 'documents' storage bucket
  uploaded_at timestamptz not null default now()
);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  sent_at timestamptz not null default now()
);

-- ---------- 2. HELPER FUNCTIONS (created after the tables they read) ----------

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admin_users a where a.user_id = auth.uid());
$$;

-- The single access rule. Full access = (trial running OR active subscription)
-- AND, for under-18s, a parent has confirmed.
create function public.has_full_access() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (not p.is_minor or exists (
            select 1 from public.parent_contacts c
            where c.student_id = p.id and c.confirmed_at is not null))
      and (p.trial_ends_at > now() or exists (
            select 1 from public.subscriptions s
            where s.user_id = p.id and s.status = 'active' and s.expires_at > now()))
  );
$$;

revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.has_full_access() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.has_full_access() to authenticated;

-- Keeps updated_at honest (the old project never updated it).
create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger trg_results_updated before update on public.results for each row execute function public.set_updated_at();
create trigger trg_subs_updated before update on public.subscriptions for each row execute function public.set_updated_at();
create trigger trg_schools_updated before update on public.schools for each row execute function public.set_updated_at();
create trigger trg_programs_updated before update on public.programs for each row execute function public.set_updated_at();
create trigger trg_scholarships_updated before update on public.scholarships for each row execute function public.set_updated_at();

-- ---------- 3. SIGNUP TRIGGER ----------
-- Runs on the server when a user is created. The front end passes these fields as signup
-- metadata: full_name, phone, date_of_birth, parent_name, parent_phone, parent_email.
-- The trial and minor flag are decided HERE, not by the browser.

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_phone text := regexp_replace(coalesce(m->>'phone',''), '\D', '', 'g');
  v_dob date;
  v_minor boolean := false;
  v_hash text;
  v_trial timestamptz := now() + interval '24 hours';
begin
  begin
    v_dob := nullif(m->>'date_of_birth','')::date;
  exception when others then
    v_dob := null;
  end;
  if v_dob is not null and v_dob > (current_date - interval '18 years')::date then
    v_minor := true;
  end if;

  -- Repeat-trial block: compare the last 9 digits (Ghana numbers) of the phone.
  if length(v_phone) >= 9 then
    v_hash := encode(extensions.digest(right(v_phone, 9), 'sha256'), 'hex');
    if exists (select 1 from public.trial_ledger where phone_hash = v_hash) then
      v_trial := null;  -- this phone already had a trial
    else
      insert into public.trial_ledger (phone_hash, user_id) values (v_hash, new.id);
    end if;
  end if;

  insert into public.profiles (id, full_name, email, phone, date_of_birth, is_minor, trial_ends_at)
  values (new.id, coalesce(m->>'full_name',''), new.email, m->>'phone', v_dob, v_minor, v_trial);

  if v_minor and coalesce(m->>'parent_email','') <> '' then
    insert into public.parent_contacts (student_id, name, phone, email)
    values (new.id, coalesce(m->>'parent_name',''), m->>'parent_phone', m->>'parent_email');
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- 4. ROW-LEVEL SECURITY ----------

alter table public.admin_users enable row level security;
alter table public.profiles enable row level security;
alter table public.parent_contacts enable row level security;
alter table public.results enable row level security;
alter table public.result_grades enable row level security;
alter table public.trial_ledger enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.schools enable row level security;
alter table public.programs enable row level security;
alter table public.program_requirements enable row level security;
alter table public.program_cutoffs enable row level security;
alter table public.scholarships enable row level security;
alter table public.documents enable row level security;
alter table public.reminders enable row level security;

-- Start from nothing, then grant only what is needed.
revoke all on all tables in schema public from anon, authenticated;

-- admin_users: a signed-in user can see only their own row (so the app can show the Admin link).
grant select on public.admin_users to authenticated;
create policy "own admin row" on public.admin_users for select to authenticated
  using (user_id = (select auth.uid()));

-- profiles: read own; update only a short list of columns (not trial, minor flag, email, etc.)
grant select on public.profiles to authenticated;
grant update (full_name, phone, shs_attended, shs_program, funding_type, desired_programs)
  on public.profiles to authenticated;
create policy "read own profile" on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "admin reads profiles" on public.profiles for select to authenticated
  using ((select public.is_admin()));
create policy "update own profile" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- parent_contacts: student reads own row but NOT confirm_token. No client writes at all.
grant select (student_id, name, phone, email, confirmed_at, created_at)
  on public.parent_contacts to authenticated;
create policy "read own parent contact" on public.parent_contacts for select to authenticated
  using (student_id = (select auth.uid()));
create policy "admin reads parent contacts" on public.parent_contacts for select to authenticated
  using ((select public.is_admin()));

-- results and grades: full control of own rows
grant select, insert, update, delete on public.results to authenticated;
create policy "own results" on public.results for all to authenticated
  using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));

grant select, insert, update, delete on public.result_grades to authenticated;
create policy "own grades" on public.result_grades for all to authenticated
  using (exists (select 1 from public.results r where r.id = result_id and r.student_id = (select auth.uid())))
  with check (exists (select 1 from public.results r where r.id = result_id and r.student_id = (select auth.uid())));

-- trial_ledger: no policies and no grants = nobody from the browser can touch it.

-- subscriptions and payments: read own only. Written by server functions (service role) only.
grant select on public.subscriptions to authenticated;
create policy "read own subscription" on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
create policy "admin reads subscriptions" on public.subscriptions for select to authenticated
  using ((select public.is_admin()));

grant select on public.payments to authenticated;
create policy "read own payments" on public.payments for select to authenticated
  using (user_id = (select auth.uid()));
create policy "admin reads payments" on public.payments for select to authenticated
  using ((select public.is_admin()));

-- Catalog tables: full rows only for users with access (trial, subscriber) or admins.
-- Everyone else uses the summary views in section 5.
grant select on public.schools, public.programs, public.program_requirements,
                public.program_cutoffs, public.scholarships to authenticated;
grant insert, update, delete on public.schools, public.programs, public.program_requirements,
                public.program_cutoffs, public.scholarships to authenticated;

create policy "full read schools" on public.schools for select to authenticated
  using ((select public.has_full_access()) or (select public.is_admin()));
create policy "full read programs" on public.programs for select to authenticated
  using ((select public.has_full_access()) or (select public.is_admin()));
create policy "full read requirements" on public.program_requirements for select to authenticated
  using ((select public.has_full_access()) or (select public.is_admin()));
create policy "full read cutoffs" on public.program_cutoffs for select to authenticated
  using ((select public.has_full_access()) or (select public.is_admin()));
create policy "full read scholarships" on public.scholarships for select to authenticated
  using ((select public.has_full_access()) or (select public.is_admin()));

create policy "admin writes schools" on public.schools for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin writes programs" on public.programs for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin writes requirements" on public.program_requirements for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin writes cutoffs" on public.program_cutoffs for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin writes scholarships" on public.scholarships for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- documents: own rows
grant select, insert, delete on public.documents to authenticated;
create policy "own documents" on public.documents for all to authenticated
  using (student_id = (select auth.uid())) with check (student_id = (select auth.uid()));

-- reminders: server only (no grants, no policies)

-- ---------- 5. SUMMARY VIEWS (what visitors and expired-trial users may see) ----------
-- Views run with the owner's rights, so they can show these few safe columns to everyone.

create view public.schools_summary as
  select id, name, country, type, city, verified from public.schools;

create view public.programs_summary as
  select id, school_id, name, level, field from public.programs;

create view public.scholarships_summary as
  select id, name, funder, country, funding_type, verified from public.scholarships;

-- Supabase hands out broad default permissions on new objects. A simple view can be written
-- through, and it would bypass row-level security, so take everything away first.
revoke all on public.schools_summary, public.programs_summary, public.scholarships_summary
  from public, anon, authenticated;
grant select on public.schools_summary, public.programs_summary, public.scholarships_summary
  to anon, authenticated;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- ---------- 6. STORAGE: private bucket for student documents ----------
-- Files must be saved at  <user id>/<file name>  so the rules below can match the folder.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 5242880,
        array['application/pdf','image/jpeg','image/png'])
on conflict (id) do nothing;

create policy "own folder read" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own folder upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own folder delete" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
