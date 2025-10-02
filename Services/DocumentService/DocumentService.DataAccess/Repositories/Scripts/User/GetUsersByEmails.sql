select id, email
    from users
    where email = any(@Emails)";