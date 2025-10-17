create table if not exists block_images
(
    id           serial primary key,
    block_id     int references blocks (id) on delete cascade,
    url          text,
    uploaded_on  timestamp default now(),
    user_id      int references users (id)
);