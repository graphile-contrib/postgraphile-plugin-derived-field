drop schema if exists p cascade;

create schema p;

create table p.person (
  id serial primary key,
  name text not null,
  email text not null,
  avatar_key text
);

comment on column p.person.name is 'The person’s name';
comment on column p.person.email is 'The person’s email';
comment on column p.person.avatar_key is '@key';