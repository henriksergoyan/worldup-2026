/*
  Warnings:

  - Added the required column `firstName` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Tournament" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Yerevan',
    "entryFee" INTEGER NOT NULL DEFAULT 10000,
    "prizeSplitJson" JSONB NOT NULL,
    "knockoutPickCount" INTEGER NOT NULL DEFAULT 16,
    "kickoffLockMinutes" INTEGER NOT NULL DEFAULT 60,
    "registrationOpen" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Tournament" ("createdAt", "entryFee", "id", "knockoutPickCount", "name", "prizeSplitJson", "timezone", "updatedAt") SELECT "createdAt", "entryFee", "id", "knockoutPickCount", "name", "prizeSplitJson", "timezone", "updatedAt" FROM "Tournament";
DROP TABLE "Tournament";
ALTER TABLE "new_Tournament" RENAME TO "Tournament";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "plainPassword" TEXT,
    "role" TEXT NOT NULL DEFAULT 'PLAYER',
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("active", "createdAt", "email", "firstName", "id", "lastName", "name", "paid", "passwordHash", "role", "updatedAt")
SELECT
  "active",
  "createdAt",
  "email",
  CASE WHEN instr("name", ' ') > 0 THEN substr("name", 1, instr("name", ' ') - 1) ELSE "name" END,
  "id",
  CASE WHEN instr("name", ' ') > 0 THEN trim(substr("name", instr("name", ' ') + 1)) ELSE "name" END,
  "name",
  "paid",
  "passwordHash",
  "role",
  "updatedAt"
FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
