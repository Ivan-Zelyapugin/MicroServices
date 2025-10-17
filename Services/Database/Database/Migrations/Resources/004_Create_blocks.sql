create table if not exists blocks
(
    id          serial primary key,
    document_id int references documents (id),
    user_id     int references users (id)
);