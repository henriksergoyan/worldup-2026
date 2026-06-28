-- Lock predictions at kickoff (0 minutes before), not 1 hour before.
UPDATE "Tournament" SET "kickoffLockMinutes" = 0 WHERE "kickoffLockMinutes" = 60;
