-- CreateEnum
CREATE TYPE "IntakeSubmissionStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'DUPLICATE', 'ERROR');

-- CreateTable
CREATE TABLE "IntakeKey" (
  "id" TEXT NOT NULL,
  "empresaId" TEXT NOT NULL,
  "equipoId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "keyHash" TEXT NOT NULL,
  "secretEncrypted" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "IntakeKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeSubmission" (
  "id" TEXT NOT NULL,
  "empresaId" TEXT NOT NULL,
  "intakeKeyId" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'google_form',
  "sheetId" TEXT NOT NULL,
  "sheetName" TEXT NOT NULL,
  "rowNumber" INTEGER,
  "externalSubmissionId" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "status" "IntakeSubmissionStatus" NOT NULL DEFAULT 'RECEIVED',
  "errorMessage" TEXT,
  "payloadRaw" JSONB NOT NULL,
  "payloadNormalized" JSONB,
  "candidateId" TEXT,

  CONSTRAINT "IntakeSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeNonce" (
  "id" TEXT NOT NULL,
  "empresaId" TEXT NOT NULL,
  "intakeKeyId" TEXT NOT NULL,
  "nonceHash" TEXT NOT NULL,
  "timestamp" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "IntakeNonce_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntakeKey_empresaId_idx" ON "IntakeKey"("empresaId");
CREATE INDEX "IntakeKey_equipoId_idx" ON "IntakeKey"("equipoId");
CREATE INDEX "IntakeKey_isActive_idx" ON "IntakeKey"("isActive");

CREATE UNIQUE INDEX "IntakeSubmission_empresaId_externalSubmissionId_key" ON "IntakeSubmission"("empresaId", "externalSubmissionId");
CREATE INDEX "IntakeSubmission_empresaId_receivedAt_idx" ON "IntakeSubmission"("empresaId", "receivedAt");
CREATE INDEX "IntakeSubmission_empresaId_status_idx" ON "IntakeSubmission"("empresaId", "status");
CREATE INDEX "IntakeSubmission_intakeKeyId_idx" ON "IntakeSubmission"("intakeKeyId");

CREATE UNIQUE INDEX "IntakeNonce_nonceHash_key" ON "IntakeNonce"("nonceHash");
CREATE INDEX "IntakeNonce_empresaId_expiresAt_idx" ON "IntakeNonce"("empresaId", "expiresAt");
CREATE INDEX "IntakeNonce_intakeKeyId_timestamp_idx" ON "IntakeNonce"("intakeKeyId", "timestamp");

-- AddForeignKey
ALTER TABLE "IntakeKey" ADD CONSTRAINT "IntakeKey_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntakeKey" ADD CONSTRAINT "IntakeKey_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "Equipo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IntakeSubmission" ADD CONSTRAINT "IntakeSubmission_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntakeSubmission" ADD CONSTRAINT "IntakeSubmission_intakeKeyId_fkey" FOREIGN KEY ("intakeKeyId") REFERENCES "IntakeKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntakeSubmission" ADD CONSTRAINT "IntakeSubmission_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidato"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "IntakeNonce" ADD CONSTRAINT "IntakeNonce_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntakeNonce" ADD CONSTRAINT "IntakeNonce_intakeKeyId_fkey" FOREIGN KEY ("intakeKeyId") REFERENCES "IntakeKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
