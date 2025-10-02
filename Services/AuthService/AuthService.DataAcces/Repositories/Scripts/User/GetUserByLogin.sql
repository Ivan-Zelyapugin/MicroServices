select id                          as Id,
       role                        as Role,
       username                    as Username,
       email                       as Email,
       password_hash               as PasswordHash,
       refresh_token               as RefreshToken,
       refresh_token_expired_after as RefreshTokenExpiredAfter,
       is_email_confirmed           as IsEmailConfirmed
from users
where (email = @login or username = @login);