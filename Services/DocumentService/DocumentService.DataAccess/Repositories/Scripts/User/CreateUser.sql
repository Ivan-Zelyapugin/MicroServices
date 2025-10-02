insert into users (id, email)
values (@Id, @Email)
returning id;
