drop schema if exists p cascade;

create schema p;

create table p.person (
  id serial primary key,
  name text not null,
  email text not null
);

comment on column p.person.name is 'The person’s name';