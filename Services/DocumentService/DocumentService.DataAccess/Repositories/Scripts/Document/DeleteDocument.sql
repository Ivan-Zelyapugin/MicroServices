DELETE FROM document_participants WHERE document_id = @id;
DELETE FROM blocks WHERE document_id = @id;
DELETE FROM documents WHERE id = @id;