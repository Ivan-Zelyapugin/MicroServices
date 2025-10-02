select user_id as UserId,
       document_id as DocumentId,
       role    as Role
from document_participants
where document_id = @documentId;