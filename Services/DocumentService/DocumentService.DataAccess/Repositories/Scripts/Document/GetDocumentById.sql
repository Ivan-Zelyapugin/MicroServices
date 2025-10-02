select id         as Id,
       name       as Name,
       creator_id as CreatorId
from documents
where id = @id;