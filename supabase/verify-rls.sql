-- After applying migration 001, run in SQL Editor on an isolated test project.
-- All fixtures are synthetic; transaction rollback removes them.
begin;
insert into auth.users(id,email) values
 ('11111111-1111-4111-8111-111111111111','rls-one@example.invalid'),
 ('22222222-2222-4222-8222-222222222222','rls-two@example.invalid');
insert into public.organizations(id,name) values
 ('33333333-3333-4333-8333-333333333333','RLS organization one'),
 ('44444444-4444-4444-8444-444444444444','RLS organization two');
insert into public.memberships(user_id,organization_id,role) values
 ('11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333','analyst'),
 ('22222222-2222-4222-8222-222222222222','44444444-4444-4444-8444-444444444444','analyst');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","aal":"aal2"}',true);
insert into public.matters(organization_id,claim_number,title,insured,jurisdiction) values
 ('33333333-3333-4333-8333-333333333333','RLS-ONE','Synthetic one','Example One LLC','New York');
do $$ begin
 if (select count(*) from public.matters where claim_number='RLS-ONE')<>1 then raise exception 'Creator cannot read own matter'; end if;
 begin
  insert into public.matters(organization_id,claim_number,title,insured,jurisdiction) values
   ('44444444-4444-4444-8444-444444444444','RLS-CROSS','Synthetic cross','Example LLC','California');
  raise exception 'Cross-organization creation allowed';
 exception when insufficient_privilege then null;
 end;
end $$;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated","aal":"aal2"}',true);
do $$ begin
 if (select count(*) from public.matters where claim_number='RLS-ONE')<>0 then raise exception 'Cross-organization read allowed'; end if;
 update public.matters set notes='Unauthorized' where claim_number='RLS-ONE';
 if found then raise exception 'Cross-organization update allowed'; end if;
end $$;
insert into public.matters(organization_id,claim_number,title,insured,jurisdiction) values
 ('44444444-4444-4444-8444-444444444444','RLS-TWO','Synthetic two','Example Two LLC','California');
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated","aal":"aal1"}',true);
do $$ begin
 if (select count(*) from public.matters)<>0 then raise exception 'Password-only read allowed'; end if;
 begin
  insert into public.matters(organization_id,claim_number,title,insured,jurisdiction) values
   ('44444444-4444-4444-8444-444444444444','RLS-NOMFA','Synthetic denied','Example LLC','California');
  raise exception 'Password-only creation allowed';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
rollback;
