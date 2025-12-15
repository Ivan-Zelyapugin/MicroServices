update users
set username = coalesce(@Username, username),
    email    = coalesce(@Email, email)
where id = @Id;