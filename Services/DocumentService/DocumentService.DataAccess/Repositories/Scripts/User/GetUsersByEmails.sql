select id, username
    from users
    where username = any(@Usernames);