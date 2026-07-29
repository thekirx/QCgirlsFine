-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('FEMALE', 'MALE', 'OTHER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "OrderPriority" AS ENUM ('ROUTINE', 'STAT');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('ACTIVE', 'CANCELED', 'RELEASED');

-- CreateEnum
CREATE TYPE "ResultSetStatus" AS ENUM ('PENDING', 'ENTERED', 'FOR_VALIDATION', 'VALIDATED', 'RELEASED');

-- CreateEnum
CREATE TYPE "ValueType" AS ENUM ('NUMERIC', 'TEXT', 'QUALITATIVE');

-- CreateEnum
CREATE TYPE "ResultSource" AS ENUM ('MANUAL', 'ANALYZER');

-- CreateEnum
CREATE TYPE "AnalyzerConnectionStatus" AS ENUM ('ONLINE', 'OFFLINE', 'DELAYED', 'ERROR');

-- CreateEnum
CREATE TYPE "AnalyzerMessageStatus" AS ENUM ('RECEIVED', 'APPLIED', 'EXCEPTION', 'DUPLICATE');

-- CreateEnum
CREATE TYPE "AnalyzerExceptionType" AS ENUM ('UNKNOWN_ACCESSION', 'UNKNOWN_TEST', 'INVALID_VALUE', 'ORDER_CANCELED', 'ORDER_RELEASED', 'IDEMPOTENCY_CONFLICT');

-- CreateEnum
CREATE TYPE "AnalyzerExceptionStatus" AS ENUM ('OPEN', 'RECONCILED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "medicalRecordNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "birthDate" DATE NOT NULL,
    "sex" "Sex" NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "valueType" "ValueType" NOT NULL,
    "unit" TEXT,
    "decimalPlaces" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TestDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceRange" (
    "id" TEXT NOT NULL,
    "testDefinitionId" TEXT NOT NULL,
    "sex" "Sex",
    "low" DECIMAL(14,4),
    "high" DECIMAL(14,4),
    "text" TEXT,

    CONSTRAINT "ReferenceRange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessionCounter" (
    "id" TEXT NOT NULL,
    "siteCode" TEXT NOT NULL,
    "businessDate" DATE NOT NULL,
    "nextValue" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "AccessionCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabOrder" (
    "id" TEXT NOT NULL,
    "accessionNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "priority" "OrderPriority" NOT NULL DEFAULT 'ROUTINE',
    "requestingPhysician" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "clinicalNotes" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'ACTIVE',
    "cancellationReason" TEXT,
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderTest" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "testDefinitionId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "OrderTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Specimen" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Specimen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResultSet" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "ResultSetStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3),
    "validatedAt" TIMESTAMP(3),
    "validatedBy" TEXT,
    "releasedAt" TIMESTAMP(3),
    "releasedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResultSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Result" (
    "id" TEXT NOT NULL,
    "resultSetId" TEXT NOT NULL,
    "orderTestId" TEXT NOT NULL,
    "valueType" "ValueType" NOT NULL,
    "numericValue" DECIMAL(18,6),
    "textValue" TEXT,
    "qualitativeCode" TEXT,
    "unit" TEXT,
    "rangeText" TEXT,
    "abnormalFlag" TEXT,
    "source" "ResultSource" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "enteredBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Result_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResultRevision" (
    "id" TEXT NOT NULL,
    "resultId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "actorId" TEXT NOT NULL,
    "source" "ResultSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResultRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportSnapshot" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "reportNumber" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "sha256" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "releasedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "reason" TEXT,
    "requestId" TEXT NOT NULL,
    "workstation" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyzerConnection" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "adapterType" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "status" "AnalyzerConnectionStatus" NOT NULL DEFAULT 'OFFLINE',
    "lastSeenAt" TIMESTAMP(3),

    CONSTRAINT "AnalyzerConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyzerMessage" (
    "id" TEXT NOT NULL,
    "gatewayMessageId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "rawSha256" TEXT NOT NULL,
    "rawPayload" TEXT NOT NULL,
    "normalizedJson" JSONB NOT NULL,
    "status" "AnalyzerMessageStatus" NOT NULL DEFAULT 'RECEIVED',
    "deliveryCount" INTEGER NOT NULL DEFAULT 1,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedAt" TIMESTAMP(3),

    CONSTRAINT "AnalyzerMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyzerException" (
    "id" TEXT NOT NULL,
    "analyzerMessageId" TEXT NOT NULL,
    "type" "AnalyzerExceptionType" NOT NULL,
    "status" "AnalyzerExceptionStatus" NOT NULL DEFAULT 'OPEN',
    "reason" TEXT NOT NULL,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyzerException_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_medicalRecordNumber_key" ON "Patient"("medicalRecordNumber");

-- CreateIndex
CREATE INDEX "Patient_lastName_firstName_idx" ON "Patient"("lastName", "firstName");

-- CreateIndex
CREATE UNIQUE INDEX "TestDefinition_code_key" ON "TestDefinition"("code");

-- CreateIndex
CREATE UNIQUE INDEX "AccessionCounter_siteCode_businessDate_key" ON "AccessionCounter"("siteCode", "businessDate");

-- CreateIndex
CREATE UNIQUE INDEX "LabOrder_accessionNumber_key" ON "LabOrder"("accessionNumber");

-- CreateIndex
CREATE INDEX "LabOrder_patientId_createdAt_idx" ON "LabOrder"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "LabOrder_status_priority_updatedAt_idx" ON "LabOrder"("status", "priority", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrderTest_orderId_testDefinitionId_key" ON "OrderTest"("orderId", "testDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "Specimen_orderId_key" ON "Specimen"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Specimen_sampleId_key" ON "Specimen"("sampleId");

-- CreateIndex
CREATE UNIQUE INDEX "ResultSet_orderId_key" ON "ResultSet"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Result_orderTestId_key" ON "Result"("orderTestId");

-- CreateIndex
CREATE UNIQUE INDEX "ResultRevision_resultId_version_key" ON "ResultRevision"("resultId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ReportSnapshot_reportNumber_key" ON "ReportSnapshot"("reportNumber");

-- CreateIndex
CREATE INDEX "ReportSnapshot_orderId_releasedAt_idx" ON "ReportSnapshot"("orderId", "releasedAt");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_occurredAt_idx" ON "AuditEvent"("entityType", "entityId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditEvent_actorId_occurredAt_idx" ON "AuditEvent"("actorId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditEvent_action_occurredAt_idx" ON "AuditEvent"("action", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyzerConnection_code_key" ON "AnalyzerConnection"("code");

-- CreateIndex
CREATE INDEX "AnalyzerMessage_status_receivedAt_idx" ON "AnalyzerMessage"("status", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyzerMessage_connectionId_idempotencyKey_key" ON "AnalyzerMessage"("connectionId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyzerException_analyzerMessageId_key" ON "AnalyzerException"("analyzerMessageId");

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferenceRange" ADD CONSTRAINT "ReferenceRange_testDefinitionId_fkey" FOREIGN KEY ("testDefinitionId") REFERENCES "TestDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderTest" ADD CONSTRAINT "OrderTest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "LabOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderTest" ADD CONSTRAINT "OrderTest_testDefinitionId_fkey" FOREIGN KEY ("testDefinitionId") REFERENCES "TestDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Specimen" ADD CONSTRAINT "Specimen_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "LabOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultSet" ADD CONSTRAINT "ResultSet_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "LabOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_resultSetId_fkey" FOREIGN KEY ("resultSetId") REFERENCES "ResultSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_orderTestId_fkey" FOREIGN KEY ("orderTestId") REFERENCES "OrderTest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultRevision" ADD CONSTRAINT "ResultRevision_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "Result"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportSnapshot" ADD CONSTRAINT "ReportSnapshot_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "LabOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyzerMessage" ADD CONSTRAINT "AnalyzerMessage_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "AnalyzerConnection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyzerException" ADD CONSTRAINT "AnalyzerException_analyzerMessageId_fkey" FOREIGN KEY ("analyzerMessageId") REFERENCES "AnalyzerMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
