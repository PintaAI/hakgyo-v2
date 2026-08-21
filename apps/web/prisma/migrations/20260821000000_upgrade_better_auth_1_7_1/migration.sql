-- Better Auth 1.7 scopes external identities by issuer instead of provider config.
ALTER TABLE "account" ADD COLUMN "issuer" TEXT;

UPDATE "account"
SET "issuer" = CASE
    WHEN "providerId" = 'credential' THEN 'local:credential'
    WHEN "providerId" = 'google' THEN 'https://accounts.google.com'
END;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "account" WHERE "issuer" IS NULL) THEN
        RAISE EXCEPTION 'Backfill issuer for unsupported account providers before upgrading Better Auth';
    END IF;
END $$;

ALTER TABLE "account" ALTER COLUMN "issuer" SET NOT NULL;
DROP INDEX "account_providerId_accountId_key";
CREATE UNIQUE INDEX "account_issuer_accountId_uidx" ON "account"("issuer", "accountId");
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- Stabilize OAuth provider records created by the Better Auth 1.7 beta.
ALTER TABLE "oauthClient"
    ADD COLUMN "clientDiscoveryId" TEXT,
    ADD COLUMN "clientCredentialsScopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN "applicationType" TEXT;

UPDATE "oauthClient"
SET "applicationType" = CASE
    WHEN "type" IN ('web', 'native') THEN "type"
    ELSE NULL
END;

UPDATE "oauthClient"
SET "tokenEndpointAuthMethod" = 'none'
WHERE "public" = TRUE AND "tokenEndpointAuthMethod" IS NULL;

DELETE FROM "oauthClientResource" duplicate
USING "oauthClientResource" retained
WHERE duplicate."clientId" = retained."clientId"
  AND duplicate."resourceId" = retained."resourceId"
  AND duplicate."id" > retained."id";

CREATE UNIQUE INDEX "oauthClientResource_clientId_resourceId_uidx"
ON "oauthClientResource"("clientId", "resourceId");

ALTER TABLE "oauthClient"
    DROP COLUMN "public",
    DROP COLUMN "type";

-- Old incomplete beta records are expired rather than made valid by the migration.
DELETE FROM "oauthAccessToken" WHERE "token" IS NULL;

UPDATE "oauthRefreshToken"
SET "createdAt" = COALESCE("createdAt", CURRENT_TIMESTAMP),
    "expiresAt" = COALESCE("expiresAt", CURRENT_TIMESTAMP);

UPDATE "oauthAccessToken"
SET "createdAt" = COALESCE("createdAt", CURRENT_TIMESTAMP),
    "expiresAt" = COALESCE("expiresAt", CURRENT_TIMESTAMP);

UPDATE "oauthConsent"
SET "createdAt" = COALESCE("createdAt", CURRENT_TIMESTAMP),
    "updatedAt" = COALESCE("updatedAt", CURRENT_TIMESTAMP);

ALTER TABLE "oauthRefreshToken"
    ALTER COLUMN "createdAt" SET NOT NULL,
    ALTER COLUMN "expiresAt" SET NOT NULL;

ALTER TABLE "oauthAccessToken"
    ALTER COLUMN "token" SET NOT NULL,
    ALTER COLUMN "createdAt" SET NOT NULL,
    ALTER COLUMN "expiresAt" SET NOT NULL;

ALTER TABLE "oauthConsent"
    ALTER COLUMN "createdAt" SET NOT NULL,
    ALTER COLUMN "updatedAt" SET NOT NULL;
