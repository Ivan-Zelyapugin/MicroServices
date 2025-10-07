select exists(select id
              from documents
              where id = @id);