select exists(select id
              from blocks
              where id = @id);