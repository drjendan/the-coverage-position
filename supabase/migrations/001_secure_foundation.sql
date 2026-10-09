-- Run once in a dedicated Supabase project. Not the local SQLite database.
-- All matter/document policies require a verified MFA (aal2) session.
begin;
create table public.organizations (id uuid primary key default gen_random_uuid(), name text not null);
create table public.memberships (
 user_id uuid primary key references auth.users(id) on delete cascade,
 organization_id uuid not null references public.organizations(id),
 role text not null check(role in ('admin','analyst','reviewer')), active boolean not null default true
);
create table public.matters (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
 claim_number text not null check(length(trim(claim_number)) between 1 and 80),
 title text not null check(length(trim(title)) between 1 and 180),
 insured text not null check(length(trim(insured)) between 1 and 180),
 claimant text not null default '' check(length(claimant)<=180),
 jurisdiction text not null check(length(trim(jurisdiction)) between 1 and 80),
 analyst text not null default '' check(length(analyst)<=120), reviewer text not null default '' check(length(reviewer)<=120),
 recipient text not null default '' check(length(recipient)<=180), incident_date date,
 notes text not null default '' check(length(notes)<=5000),
 status text not null default 'New' check(status in ('New','Needs Information','Archived')),
 created_by uuid not null default auth.uid() references auth.users(id),
 version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(organization_id,claim_number), unique(id,organization_id)
);
create table public.matter_access (
 matter_id uuid not null references public.matters(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 can_edit boolean not null default false, primary key(matter_id,user_id)
);
create table public.documents (
 id uuid primary key default gen_random_uuid(), matter_id uuid not null,
 organization_id uuid not null, foreign key(matter_id,organization_id) references public.matters(id,organization_id),
 filename text not null check(length(filename) between 1 and 180),
 document_type text not null check(document_type in ('complaint','policy','supporting')),
 byte_size bigint not null check(byte_size between 5 and 52428800),
 client_sha256 text not null check(client_sha256 ~ '^[a-f0-9]{64}$'),
 storage_path text not null unique,
 status text not null default 'awaiting_upload' check(status in ('awaiting_upload','pending_scan','verified','rejected')),
 uploaded_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now()
);
create table public.audit_events (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
 matter_id uuid not null references public.matters(id), actor uuid not null references auth.users(id),
 action text not null, version integer not null, created_at timestamptz not null default now()
);

create function public.member_org() returns uuid language sql stable security definer set search_path='' as $$
 select organization_id from public.memberships where user_id=auth.uid() and active
$$;
create function public.member_role() returns text language sql stable security definer set search_path='' as $$
 select role from public.memberships where user_id=auth.uid() and active
$$;
create function public.can_access_matter(target uuid, editing boolean default false) returns boolean
 language sql stable security definer set search_path='' as $$
 select coalesce((auth.jwt()->>'aal')='aal2',false) and exists(
  select 1 from public.matters m where m.id=target and m.organization_id=public.member_org()
  and (public.member_role()='admin' or exists(select 1 from public.matter_access a where a.matter_id=m.id and a.user_id=auth.uid() and (not editing or a.can_edit)))
 )
$$;

alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.matters enable row level security;
alter table public.matter_access enable row level security;
alter table public.documents enable row level security;
alter table public.audit_events enable row level security;
create policy own_membership on public.memberships for select to authenticated using(user_id=auth.uid() and active);
create policy own_org on public.organizations for select to authenticated using(id=public.member_org() and auth.jwt()->>'aal'='aal2');
create policy read_matters on public.matters for select to authenticated using((organization_id=public.member_org() and created_by=auth.uid() and auth.jwt()->>'aal'='aal2') or public.can_access_matter(id));
create policy create_matters on public.matters for insert to authenticated with check(
 organization_id=public.member_org() and public.member_role() in ('admin','analyst') and auth.jwt()->>'aal'='aal2' and created_by=auth.uid()
);
create policy edit_matters on public.matters for update to authenticated using(public.can_access_matter(id,true)) with check(public.can_access_matter(id,true));
create policy read_assignments on public.matter_access for select to authenticated using(public.can_access_matter(matter_id));
create policy read_documents on public.documents for select to authenticated using(public.can_access_matter(matter_id));
create policy register_document on public.documents for insert to authenticated with check(
 organization_id=public.member_org() and public.can_access_matter(matter_id,true) and uploaded_by=auth.uid()
 and storage_path=organization_id::text||'/'||matter_id::text||'/'||id::text||'/source.pdf'
);
create policy read_audit on public.audit_events for select to authenticated using(public.can_access_matter(matter_id));

create function public.matter_before_update() returns trigger language plpgsql set search_path='' as $$
begin
 if new.organization_id<>old.organization_id or new.created_by<>old.created_by or new.id<>old.id then raise exception 'Immutable identity'; end if;
 new.created_at=old.created_at; new.version=old.version+1; new.updated_at=now(); return new;
end $$;
create trigger matter_versions before update on public.matters for each row execute function public.matter_before_update();
create function public.record_matter() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then insert into public.matter_access(matter_id,user_id,can_edit) values(new.id,new.created_by,true); end if;
 insert into public.audit_events(organization_id,matter_id,actor,action,version)
 values(new.organization_id,new.id,auth.uid(),case when tg_op='INSERT' then 'Matter created' else 'Matter updated' end,new.version);
 return new;
end $$;
create trigger matter_audit after insert or update on public.matters for each row execute function public.record_matter();

-- Only the registering user may complete an upload; this never marks a file safe.
create function public.finish_upload(document_id uuid) returns public.documents
 language plpgsql security definer set search_path='' as $$
declare d public.documents; actual_size bigint;
begin
 select * into d from public.documents where id=document_id for update;
 if d.id is null or d.uploaded_by<>auth.uid() or not public.can_access_matter(d.matter_id,true) then raise exception 'Access denied'; end if;
 if d.status<>'awaiting_upload' then raise exception 'Upload already finalized'; end if;
 select (metadata->>'size')::bigint into actual_size from storage.objects where bucket_id='claim-documents' and name=d.storage_path;
 if actual_size is null or actual_size<>d.byte_size then raise exception 'Object missing or size mismatch'; end if;
 update public.documents set status='pending_scan' where id=d.id returning * into d;
 insert into public.audit_events(organization_id,matter_id,actor,action,version) values(d.organization_id,d.matter_id,auth.uid(),'Document uploaded; pending scan',1);
 return d;
end $$;

-- Remove automatic API grants, then grant only the required columns/actions.
revoke all on public.organizations,public.memberships,public.matters,public.matter_access,public.documents,public.audit_events from anon,authenticated;
grant select on public.organizations,public.memberships,public.matters,public.matter_access,public.documents,public.audit_events to authenticated;
grant insert(organization_id,claim_number,title,insured,claimant,jurisdiction,analyst,reviewer,recipient,incident_date,notes,status) on public.matters to authenticated;
grant update(claim_number,title,insured,claimant,jurisdiction,analyst,reviewer,recipient,incident_date,notes,status) on public.matters to authenticated;
grant insert(id,matter_id,organization_id,filename,document_type,byte_size,client_sha256,storage_path) on public.documents to authenticated;
revoke all on function public.member_org(),public.member_role(),public.can_access_matter(uuid,boolean),public.finish_upload(uuid) from public,anon;
grant execute on function public.member_org(),public.member_role(),public.can_access_matter(uuid,boolean),public.finish_upload(uuid) to authenticated;
revoke all on function public.record_matter(),public.matter_before_update() from public,anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('claim-documents','claim-documents',false,52428800,array['application/pdf']);
create policy registered_upload on storage.objects for insert to authenticated with check(
 bucket_id='claim-documents' and exists(select 1 from public.documents d where d.storage_path=name and d.uploaded_by=auth.uid() and d.status='awaiting_upload' and public.can_access_matter(d.matter_id,true))
);
-- No overwrite/delete or download permission for unscanned objects.
create policy verified_download on storage.objects for select to authenticated using(
 bucket_id='claim-documents' and exists(select 1 from public.documents d where d.storage_path=name and d.status='verified' and public.can_access_matter(d.matter_id))
);
commit;
