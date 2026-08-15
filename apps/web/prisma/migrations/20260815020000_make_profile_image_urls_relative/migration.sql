UPDATE "user"
SET "image" = substring("image" FROM '(/api/profile-images/.*)$')
WHERE "image" ~ '^https?://[^/]+/api/profile-images/';
