create table if not exists document_participants
(
    user_id     int references users (id),
    document_id int references documents (id),
    role        int default 0
);