DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserStatus') THEN
    CREATE TYPE "UserStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InvitationStatus') THEN
    CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'USED', 'EXPIRED', 'REVOKED');
  END IF;
END $$;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "username" TEXT,
  ADD COLUMN IF NOT EXISTS "passwordHash" TEXT,
  ADD COLUMN IF NOT EXISTS "googleId" TEXT,
  ADD COLUMN IF NOT EXISTS "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "invitedById" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX IF NOT EXISTS "User_googleId_key" ON "User"("googleId");
CREATE INDEX IF NOT EXISTS "User_status_idx" ON "User"("status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'User_invitedById_fkey'
  ) THEN
    ALTER TABLE "User"
      ADD CONSTRAINT "User_invitedById_fkey"
      FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "Invitacion"
  ADD COLUMN IF NOT EXISTS "code" TEXT,
  ADD COLUMN IF NOT EXISTS "usedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "revokedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Invitacion"
SET
  "code" = COALESCE(
    "code",
    'ATLAS-' || UPPER(SUBSTRING("token", 1, 4)) || '-' || UPPER(SUBSTRING("token", 5, 4)) || '-' || UPPER(SUBSTRING("token", 9, 4))
  ),
  "usedAt" = COALESCE("usedAt", "usadoEn"),
  "status" = CASE
    WHEN "usada" = true THEN 'USED'::"InvitationStatus"
    WHEN "expiresAt" < CURRENT_TIMESTAMP THEN 'EXPIRED'::"InvitationStatus"
    ELSE 'PENDING'::"InvitationStatus"
  END,
  "sentAt" = COALESCE("sentAt", "createdAt"),
  "lastSentAt" = COALESCE("lastSentAt", "createdAt"),
  "updatedAt" = CURRENT_TIMESTAMP;

ALTER TABLE "Invitacion"
  ALTER COLUMN "code" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Invitacion_code_key" ON "Invitacion"("code");
CREATE INDEX IF NOT EXISTS "Invitacion_code_idx" ON "Invitacion"("code");
CREATE INDEX IF NOT EXISTS "Invitacion_status_idx" ON "Invitacion"("status");
CREATE INDEX IF NOT EXISTS "Invitacion_email_status_idx" ON "Invitacion"("email", "status");

ALTER TABLE "Invitacion"
  DROP COLUMN IF EXISTS "usada",
  DROP COLUMN IF EXISTS "usadoEn";

CREATE TABLE IF NOT EXISTS "PasswordReset" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PasswordReset_token_key" ON "PasswordReset"("token");
CREATE INDEX IF NOT EXISTS "PasswordReset_userId_expiresAt_idx" ON "PasswordReset"("userId", "expiresAt");
CREATE INDEX IF NOT EXISTS "PasswordReset_token_expiresAt_idx" ON "PasswordReset"("token", "expiresAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'PasswordReset_userId_fkey'
  ) THEN
    ALTER TABLE "PasswordReset"
      ADD CONSTRAINT "PasswordReset_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DROP TABLE IF EXISTS "DemoKey";
DROP TYPE IF EXISTS "EstatusDemoKey";
