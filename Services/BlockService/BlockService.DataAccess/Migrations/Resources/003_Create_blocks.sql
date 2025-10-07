create table if not exists blocks
(
    id          serial primary key,
    text        text,
    sent_on     timestamp,
    document_id int references documents (id),
    user_id     int references users (id),
    edited_on   timestamp
);