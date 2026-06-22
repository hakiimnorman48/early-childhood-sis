-- CreateTable
CREATE TABLE "DomainExample" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "competencyAreaId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "date" TEXT,
    "session" TEXT,
    "text" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DomainExample_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DomainExample_competencyAreaId_fkey" FOREIGN KEY ("competencyAreaId") REFERENCES "CompetencyArea" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DomainExample_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DomainExample_studentId_competencyAreaId_periodId_slot_key" ON "DomainExample"("studentId", "competencyAreaId", "periodId", "slot");
