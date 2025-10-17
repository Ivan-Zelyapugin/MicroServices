select u.id       as UserId,
       u.username as Username,
       cp.document_id as DocumentId,
       cp.role    as Role
from document_participants cp
         join users u on cp.user_id = u.id
where cp.user_id = @userId
  and cp.document_id = @documentId;