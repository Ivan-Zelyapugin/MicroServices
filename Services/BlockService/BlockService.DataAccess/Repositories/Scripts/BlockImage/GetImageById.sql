select id          as Id,
       block_id    as BlockId,
       url         as Url,
       uploaded_on as UploadedOn,
       user_id     as UserId
from block_images
where id = @Id;