INSERT INTO block_images (block_id, url, uploaded_on, user_id)
VALUES (@BlockId, @Url, @UploadedOn, @UserId)
RETURNING id;