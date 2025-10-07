select id        as Id,
       text      as Text,
       sent_on   as SentOn,
       document_id   as DocumentId,
       user_id   as UserId,
       edited_on as EditedOn
from blocks
where document_id = @documentId
  and sent_on >= @from
order by sent_on;