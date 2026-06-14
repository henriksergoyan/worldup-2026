-- Rename login field from email to username.
ALTER TABLE "User" RENAME COLUMN "email" TO "username";

-- Legacy logins used firstname.lastname@example.com — strip the domain.
UPDATE "User"
SET "username" = LOWER(SUBSTR("username", 1, INSTR("username", '@') - 1))
WHERE INSTR("username", '@') > 0;

-- Single-part logins become name.[blank] (no surname).
UPDATE "User"
SET "username" = "username" || '.[blank]'
WHERE INSTR("username", '.') = 0;
