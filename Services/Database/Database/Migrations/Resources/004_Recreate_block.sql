DROP TABLE IF EXISTS blocks CASCADE;

CREATE TABLE blocks
(
    id          SERIAL PRIMARY KEY,
    text        TEXT,
    sent_on     TIMESTAMP,
    document_id INT REFERENCES documents (id),
    user_id     INT REFERENCES users (id),
    edited_on   TIMESTAMP
);