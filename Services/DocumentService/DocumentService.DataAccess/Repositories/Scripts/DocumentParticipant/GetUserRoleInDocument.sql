SELECT role
FROM document_participants
WHERE user_id = @userId AND document_id = @documentId;
