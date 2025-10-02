UPDATE users
SET is_email_confirmed = TRUE
WHERE email = @email;