insert into blocks (text, sent_on, document_id, user_id)
values (@Text, @SentOn, @DocumentId, @UserId)
returning id;