insert into documents (name, creator_id)
values (@Name, @CreatorId)
returning id;