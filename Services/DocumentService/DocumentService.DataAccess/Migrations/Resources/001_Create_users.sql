create table if not exists users
(
    id                          serial primary key,
    email                       text unique not null
);

create index user_id_index on users (id);