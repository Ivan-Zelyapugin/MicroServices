select exists(select user_id
              from document_participants
              where user_id = @userId
                and document_id = @documentId);