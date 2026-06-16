-- AlterTable
ALTER TABLE "User" ADD COLUMN "address" TEXT;

-- CreateTable
CREATE TABLE "DomainCompletion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "competencyAreaId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DomainCompletion_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DomainCompletion_competencyAreaId_fkey" FOREIGN KEY ("competencyAreaId") REFERENCES "CompetencyArea" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DomainCompletion_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DomainCompletion_studentId_competencyAreaId_periodId_key" ON "DomainCompletion"("studentId", "competencyAreaId", "periodId");
