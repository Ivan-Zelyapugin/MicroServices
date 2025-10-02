UPDATE document_participants
SET role = @role
WHERE user_id = @userId AND document_id = @documentId;