drop schema if exists p cascade;

create schema p;

create type p.menu_extras_type as enum (
  'logo',
  'emails',
  'locations',
  'phones',
  'search'
);

create type p.menu_extras_with_defaults as (
  menu_extra p.menu_extras_type,
  is_enabled boolean
);

create table p.person (
  id serial primary key,
  name text not null,
  email text not null,
  avatar_key text,
  menu_extras p.menu_extras_type[]
);

comment on column p.person.name is 'The person’s name';
comment on column p.person.email is 'The person’s email';
comment on column p.person.avatar_key is '@key';
