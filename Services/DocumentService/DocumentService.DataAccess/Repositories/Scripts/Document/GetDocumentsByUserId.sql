select c.id         as Id,
       c.name       as Name,
       c.creator_id as CreatorId
from documents c
         join document_participants cp on c.id = cp.document_id
where cp.user_id = @userId;