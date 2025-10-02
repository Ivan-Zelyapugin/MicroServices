create table if not exists documents
(
    id         serial primary key,
    name       text,
    creator_id int references users (id)
);

create index document_id_index on documents (id);