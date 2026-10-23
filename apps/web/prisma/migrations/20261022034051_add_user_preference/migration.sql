-- CreateTable
CREATE TABLE "UserPreference" (
    "userId" TEXT NOT NULL,
    "showHangeulAfterMastery" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Mobile sync: preference writes change the learner's index (Hangeul visibility),
-- like the other user-state tables in 20260929000000_mobile_sync_change_log.
CREATE TRIGGER mobile_sync_change_insert AFTER INSERT ON "UserPreference"
    REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT
    EXECUTE FUNCTION mobile_sync_change_column('user', 'state', 'userId');
CREATE TRIGGER mobile_sync_change_update AFTER UPDATE ON "UserPreference"
    REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows FOR EACH STATEMENT
    EXECUTE FUNCTION mobile_sync_change_column('user', 'state', 'userId');
CREATE TRIGGER mobile_sync_change_delete AFTER DELETE ON "UserPreference"
    REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT
    EXECUTE FUNCTION mobile_sync_change_column('user', 'state', 'userId');
