insert into users (role, username, email, password_hash, refresh_token, refresh_token_expired_after)
values (@Role, @Username, @Email, @PasswordHash, @RefreshToken, @RefreshTokenExpiredAfter)
returning id;