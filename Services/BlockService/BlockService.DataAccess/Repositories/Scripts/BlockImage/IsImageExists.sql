select exists(select id
              from block_images
              where id = @Id);