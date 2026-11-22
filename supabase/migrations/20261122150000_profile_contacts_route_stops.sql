alter table public.profiles
  add column if not exists first_name text not null default '',
  add column if not exists last_name text not null default '',
  add column if not exists address text not null default '';

update public.profiles
set first_name = coalesce(nullif(first_name, ''), split_part(trim(coalesce(full_name, '')), ' ', 1)),
    last_name = coalesce(nullif(last_name, ''), nullif(substring(trim(coalesce(full_name, '')) from length(split_part(trim(coalesce(full_name, '')), ' ', 1)) + 2), ''), '')
where first_name = '' or last_name = '';

alter table public.ride_requests
  add column if not exists via_address text,
  add column if not exists via_latitude numeric,
  add column if not exists via_longitude numeric;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_first_name text := coalesce(nullif(trim(new.raw_user_meta_data->>'first_name'), ''), split_part(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ' ', 1));
  v_last_name text := coalesce(nullif(trim(new.raw_user_meta_data->>'last_name'), ''), nullif(substring(trim(coalesce(new.raw_user_meta_data->>'full_name', '')) from length(split_part(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ' ', 1)) + 2), ''));
begin
  insert into public.profiles (id, role, first_name, last_name, full_name, address, phone, login_name)
  values (
    new.id,
    case when new.raw_user_meta_data->>'role' = 'driver' then 'driver' else 'passenger' end,
    coalesce(v_first_name, ''),
    coalesce(v_last_name, ''),
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), trim(concat_ws(' ', v_first_name, v_last_name)), ''),
    coalesce(nullif(trim(new.raw_user_meta_data->>'address'), ''), ''),
    nullif(trim(new.raw_user_meta_data->>'phone'), ''),
    nullif(lower(trim(new.raw_user_meta_data->>'login_name')), '')
  )
  on conflict (id) do nothing;

  if new.raw_user_meta_data->>'role' = 'driver' then
    insert into public.driver_profiles (id)
    values (new.id)
    on conflict (id) do nothing;
  end if;

  return new;
end;
$function$;

drop policy if exists ride_requests_select_assigned_driver on public.ride_requests;
create policy ride_requests_select_assigned_driver
  on public.ride_requests
  for select
  to authenticated
  using (
    auth.uid() = selected_driver_id
    and status in ('accepted', 'in_progress')
  );

create or replace function public.get_ride_contact_phone(p_ride_request_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_phone text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select case
    when auth.uid() = rr.passenger_id then driver_profile.phone
    when auth.uid() = rr.selected_driver_id then passenger_profile.phone
  end
  into v_phone
  from public.ride_requests as rr
  left join public.profiles as passenger_profile on passenger_profile.id = rr.passenger_id
  left join public.profiles as driver_profile on driver_profile.id = rr.selected_driver_id
  where rr.id = p_ride_request_id
    and rr.status in ('accepted', 'in_progress')
    and (auth.uid() = rr.passenger_id or auth.uid() = rr.selected_driver_id)
  limit 1;

  if not found then
    raise exception 'Contact access denied for this ride' using errcode = '42501';
  end if;

  return v_phone;
end;
$function$;

revoke all on function public.get_ride_contact_phone(uuid) from public, anon;
grant execute on function public.get_ride_contact_phone(uuid) to authenticated;
