import path from "node:path";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

const dbPath = path.resolve(process.cwd(), "dev.db");
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log("🌱 Seeding database...");

  // ── School ──────────────────────────────────────────────────────────────────
  const school = await prisma.school.upsert({
    where: { id: "school-tkcp" },
    update: {},
    create: {
      id: "school-tkcp",
      name: "TK Cita Pelangi",
      academicYear: "2025/2026",
      timezone: "Asia/Jakarta",
      address: "Jl. Pelangi No. 1, Jakarta",
      email: "info@tkcp.id",
      phone: "+62-21-1234567",
    },
  });

  // ── Users ───────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("demo1234", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@tkcp.id" },
    update: {},
    create: {
      email: "admin@tkcp.id",
      password: passwordHash,
      name: "Nina Karina Tambunan",
      role: "admin",
      schoolId: school.id,
    },
  });

  const teacherDevina = await prisma.user.upsert({
    where: { email: "ms.devina@tkcp.id" },
    update: {},
    create: {
      email: "ms.devina@tkcp.id",
      password: passwordHash,
      name: "Ms. Devina",
      role: "teacher",
      schoolId: school.id,
    },
  });

  const teacherIda = await prisma.user.upsert({
    where: { email: "ms.ida@tkcp.id" },
    update: {},
    create: {
      email: "ms.ida@tkcp.id",
      password: passwordHash,
      name: "Ms. Ida",
      role: "teacher",
      schoolId: school.id,
    },
  });

  const teacherEnglish = await prisma.user.upsert({
    where: { email: "ms.sarah@tkcp.id" },
    update: {},
    create: {
      email: "ms.sarah@tkcp.id",
      password: passwordHash,
      name: "Ms. Sarah",
      role: "teacher",
      schoolId: school.id,
    },
  });

  // ── Parent accounts ─────────────────────────────────────────────────────────
  const parents = [
    { email: "parent.ayla@gmail.com", name: "Budi Santoso" },
    { email: "parent.bima@gmail.com", name: "Dewi Rahayu" },
    { email: "parent.caca@gmail.com", name: "Ahmad Fauzi" },
    { email: "parent.dira@gmail.com", name: "Sri Wahyuni" },
    { email: "parent.evan@gmail.com", name: "Rudi Hermawan" },
    { email: "parent.fira@gmail.com", name: "Rani Sari" },
    { email: "parent.gani@gmail.com", name: "Hendra Kusuma" },
    { email: "parent.hani@gmail.com", name: "Yuli Astuti" },
  ];

  const parentUsers = await Promise.all(
    parents.map((p) =>
      prisma.user.upsert({
        where: { email: p.email },
        update: {},
        create: { email: p.email, password: passwordHash, name: p.name, role: "parent", schoolId: school.id },
      })
    )
  );

  // ── Classes ─────────────────────────────────────────────────────────────────
  const classA = await prisma.class.upsert({
    where: { id: "class-tka" },
    update: {},
    create: { id: "class-tka", name: "TK A", grade: "Kindergarten", schoolId: school.id },
  });

  const classB = await prisma.class.upsert({
    where: { id: "class-tkb" },
    update: {},
    create: { id: "class-tkb", name: "TK B", grade: "Kindergarten", schoolId: school.id },
  });

  const classPlaygroup = await prisma.class.upsert({
    where: { id: "class-playgroup" },
    update: {},
    create: { id: "class-playgroup", name: "Playgroup", grade: "Playgroup", schoolId: school.id },
  });

  // ── Class-teacher assignments ────────────────────────────────────────────────
  await prisma.classTeacher.upsert({
    where: { classId_teacherId: { classId: classB.id, teacherId: teacherDevina.id } },
    update: {},
    create: { classId: classB.id, teacherId: teacherDevina.id, isHomeroom: true },
  });
  await prisma.classTeacher.upsert({
    where: { classId_teacherId: { classId: classB.id, teacherId: teacherIda.id } },
    update: {},
    create: { classId: classB.id, teacherId: teacherIda.id, isHomeroom: false },
  });
  await prisma.classTeacher.upsert({
    where: { classId_teacherId: { classId: classA.id, teacherId: teacherIda.id } },
    update: {},
    create: { classId: classA.id, teacherId: teacherIda.id, isHomeroom: true },
  });

  // ── Students ─────────────────────────────────────────────────────────────────
  // picTeacherId: assigned after teachers are created
  const studentData = [
    { id: "stu-ayla", name: "Ayla Putri Santoso", nick: "Ayla", dob: "2020-03-15", classId: classB.id, parentIdx: 0, gender: "F", picTeacherId: () => teacherDevina.id },
    { id: "stu-bima", name: "Bima Arya Rahayu", nick: "Bima", dob: "2020-07-22", classId: classB.id, parentIdx: 1, gender: "M", picTeacherId: () => teacherDevina.id },
    { id: "stu-caca", name: "Cahaya Nadia Fauzi", nick: "Caca", dob: "2020-01-10", classId: classB.id, parentIdx: 2, gender: "F", picTeacherId: () => teacherIda.id },
    { id: "stu-dira", name: "Diran Wahyudi", nick: "Dira", dob: "2020-05-08", classId: classB.id, parentIdx: 3, gender: "M", picTeacherId: () => teacherIda.id },
    { id: "stu-evan", name: "Evan Hermawan", nick: "Evan", dob: "2021-02-14", classId: classA.id, parentIdx: 4, gender: "M", picTeacherId: () => teacherDevina.id },
    { id: "stu-fira", name: "Fira Sari", nick: "Fira", dob: "2021-06-30", classId: classA.id, parentIdx: 5, gender: "F", picTeacherId: () => teacherIda.id },
    { id: "stu-gani", name: "Gani Kusuma", nick: "Gani", dob: "2021-09-05", classId: classA.id, parentIdx: 6, gender: "M", picTeacherId: () => teacherDevina.id },
    { id: "stu-hani", name: "Hani Astuti", nick: "Hani", dob: "2021-11-20", classId: classA.id, parentIdx: 7, gender: "F", picTeacherId: () => teacherIda.id },
  ];

  const students = await Promise.all(
    studentData.map((s) =>
      prisma.student.upsert({
        where: { id: s.id },
        update: { picTeacherId: s.picTeacherId() },
        create: {
          id: s.id,
          fullName: s.name,
          nickname: s.nick,
          dateOfBirth: new Date(s.dob),
          classId: s.classId,
          schoolId: school.id,
          gender: s.gender,
          picTeacherId: s.picTeacherId(),
          enrollmentDate: new Date("2025-07-15"),
        },
      })
    )
  );

  // Link parents to students
  for (let i = 0; i < studentData.length; i++) {
    const s = studentData[i];
    await prisma.parentStudent.upsert({
      where: { parentId_studentId: { parentId: parentUsers[s.parentIdx].id, studentId: students[i].id } },
      update: {},
      create: { parentId: parentUsers[s.parentIdx].id, studentId: students[i].id },
    });
  }

  // ── Competency areas (TK Cita Pelangi template) ─────────────────────────────
  const areaConfig = [
    {
      id: "area-inisiatif", name: "Inisiatif", order: 1,
      skills: [
        { id: "sk-in-1", name: "Berani mencoba hal baru", order: 1 },
        { id: "sk-in-2", name: "Mengambil keputusan sendiri", order: 2 },
        { id: "sk-in-3", name: "Bertanya kepada guru", order: 3 },
        { id: "sk-in-4", name: "Menyelesaikan tugas mandiri", order: 4 },
        { id: "sk-in-5", name: "Percaya diri di depan teman", order: 5 },
      ],
    },
    {
      id: "area-berinteraksi", name: "Berinteraksi dengan orang lain", order: 2,
      skills: [
        { id: "sk-bi-1", name: "Berbagi dengan teman", order: 1 },
        { id: "sk-bi-2", name: "Menunggu giliran", order: 2 },
        { id: "sk-bi-3", name: "Membantu teman", order: 3 },
        { id: "sk-bi-4", name: "Bermain bersama", order: 4 },
        { id: "sk-bi-5", name: "Menghormati orang dewasa", order: 5 },
        { id: "sk-bi-6", name: "Mengelola emosi", order: 6 },
      ],
    },
    {
      id: "area-kreativitas", name: "Kreativitas", order: 3,
      skills: [
        { id: "sk-kr-1", name: "Menggambar dengan bebas", order: 1 },
        { id: "sk-kr-2", name: "Bermain peran", order: 2 },
        { id: "sk-kr-3", name: "Membuat karya seni", order: 3 },
        { id: "sk-kr-4", name: "Bercerita dengan imajinasi", order: 4 },
        { id: "sk-kr-5", name: "Mewarnai dengan teliti", order: 5 },
        { id: "sk-kr-6", name: "Bermain musik sederhana", order: 6 },
        { id: "sk-kr-7", name: "Eksplorasi bahan seni", order: 7 },
      ],
    },
    {
      id: "area-motorik", name: "Motorik dan Musik", order: 4,
      skills: [
        { id: "sk-mo-1", name: "Melempar/menangkap/menendang suatu benda sesuai dengan arahan teman atau guru.", order: 1 },
        { id: "sk-mo-2", name: "Berputar kemudian berhenti tanpa terjatuh.", order: 2 },
        { id: "sk-mo-3", name: "Mengikuti ketukan musik dari lagu yang diperdengarkan atau dinyanyikan.", order: 3 },
        { id: "sk-mo-4", name: "Mengikuti 3 gerakan berbeda yang berurutan, yang dicontohkan oleh orang lain.", order: 4 },
        { id: "sk-mo-5", name: "Ikut menyanyikan lagu yang sedang didengarnya dengan kata yang jelas.", order: 5 },
        { id: "sk-mo-6", name: "Menyanyikan sebuah lagu, sendiri atau bersama dengan orang lain.", order: 6 },
        { id: "sk-mo-7", name: "Memainkan suatu alat musik atau benda sehingga menghasilkan suatu nada atau ketukan.", order: 7 },
      ],
    },
    {
      id: "area-bahasa", name: "Bahasa", order: 5,
      skills: [
        { id: "sk-ba-1", name: "Mendengarkan instruksi", order: 1 },
        { id: "sk-ba-2", name: "Mengikuti perintah 2 langkah", order: 2 },
        { id: "sk-ba-3", name: "Menyebut kosakata baru", order: 3 },
        { id: "sk-ba-4", name: "Bercerita tentang pengalaman", order: 4 },
        { id: "sk-ba-5", name: "Mengenal huruf alfabet", order: 5 },
        { id: "sk-ba-6", name: "Menulis nama sendiri", order: 6 },
        { id: "sk-ba-7", name: "Membaca gambar dan simbol", order: 7 },
        { id: "sk-ba-8", name: "Menyimak cerita", order: 8 },
        { id: "sk-ba-9", name: "Berdiskusi dalam kelompok", order: 9 },
        { id: "sk-ba-10", name: "Menggunakan kalimat lengkap", order: 10 },
      ],
    },
    {
      id: "area-math", name: "Matematika dan Sains", order: 6,
      skills: [
        { id: "sk-ma-1", name: "Mengelompokkan benda berdasarkan warna/bentuk/jenis/ukuran dan menyebutkan pengelompokkan tersebut.", order: 1 },
        { id: "sk-ma-2", name: "Menjelaskan persamaan atau perbedaan diantara beberapa barang.", order: 2 },
        { id: "sk-ma-3", name: "Membuat pola (pattern) sederhana dan menyebutkannya.", order: 3 },
        { id: "sk-ma-4", name: "Mengurutkan benda dari ukuran terbesar hingga terkecil atau sebaliknya.", order: 4 },
        { id: "sk-ma-5", name: "Menggunakan kata perbandingan untuk menjelaskan 2 benda.", order: 5 },
        { id: "sk-ma-6", name: "Menghitung, menjumlahkan dan mengurangkan dengan menggunakan sejumlah benda.", order: 6 },
        { id: "sk-ma-7", name: "Menghitung 2 kumpulan benda dan membedakan yang banyak, sedikit atau sama.", order: 7 },
        { id: "sk-ma-8", name: "Menggunakan kata posisi sesuai dengan konteks.", order: 8 },
        { id: "sk-ma-9", name: "Menggunakan kata jarak sesuai dengan konteks.", order: 9 },
        { id: "sk-ma-10", name: "Mengenali perubahan pada benda dan menyebutkan perubahan tersebut.", order: 10 },
        { id: "sk-ma-11", name: "Mengenali dan menyebutkan benda mati dan benda hidup.", order: 11 },
        { id: "sk-ma-12", name: "Menjelaskan perbedaan antara benda mati dan benda hidup yang sedang didiskusikan.", order: 12 },
      ],
    },
    {
      id: "area-english", name: "English", order: 7, customScale: true,
      skills: [
        { id: "sk-en-1", name: "Speaking", order: 1 },
        { id: "sk-en-2", name: "Listening", order: 2 },
        { id: "sk-en-3", name: "Reading", order: 3 },
        { id: "sk-en-4", name: "Singing", order: 4 },
      ],
    },
  ];

  for (const area of areaConfig) {
    await prisma.competencyArea.upsert({
      where: { id: area.id },
      update: {},
      create: {
        id: area.id,
        name: area.name,
        order: area.order,
        schoolId: school.id,
        customScale: area.customScale ?? false,
      },
    });
    for (const skill of area.skills) {
      await prisma.skill.upsert({
        where: { id: skill.id },
        update: { name: skill.name, order: skill.order },
        create: {
          id: skill.id,
          name: skill.name,
          order: skill.order,
          competencyAreaId: area.id,
        },
      });
    }
  }

  // ── Reporting period ─────────────────────────────────────────────────────────
  const period = await prisma.period.upsert({
    where: { id: "period-sem1-2025" },
    update: {},
    create: {
      id: "period-sem1-2025",
      name: "Semester 1, 2025",
      startDate: new Date("2025-07-14"),
      endDate: new Date("2025-12-19"),
      closeDate: new Date("2025-12-26"),
      type: "semester",
      schoolId: school.id,
      isActive: true,
    },
  });

  // ── Domain assignments ───────────────────────────────────────────────────────
  const domainToTeacher: Record<string, string> = {
    "area-inisiatif": teacherDevina.id,
    "area-berinteraksi": teacherDevina.id,
    "area-kreativitas": teacherDevina.id,
    "area-motorik": teacherIda.id,
    "area-bahasa": teacherDevina.id,
    "area-math": teacherIda.id,
    "area-english": teacherEnglish.id,
  };

  for (const [areaId, teacherId] of Object.entries(domainToTeacher)) {
    try {
      await prisma.domainAssignment.upsert({
        where: { classId_competencyAreaId_periodId: { classId: classB.id, competencyAreaId: areaId, periodId: period.id } },
        update: {},
        create: { classId: classB.id, competencyAreaId: areaId, teacherId, periodId: period.id },
      });
    } catch (_) {}
  }

  // ── Progress entries for TK B students ──────────────────────────────────────
  const tkbStudents = students.filter((s) =>
    studentData.find((sd) => sd.id === s.id)?.classId === classB.id
  );

  function rand(min: number, max: number) {
    return Math.round((Math.random() * (max - min) + min) * 2) / 2;
  }

  function scoreToCode(score: number): string {
    if (score <= 3) return "P";
    if (score <= 6) return "C";
    return "B";
  }

  const skillIds = areaConfig
    .filter((a) => !a.customScale)
    .flatMap((a) => a.skills.map((s) => s.id));

  const entryData: Array<{
    studentId: string; skillId: string; periodId: string;
    score: number; mappedCode: string; isDraft: boolean;
  }> = [];

  const scoreRanges: Record<string, [number, number]> = {
    "stu-ayla": [7.5, 10],
    "stu-bima": [5, 8],
    "stu-caca": [4, 7.5],
    "stu-dira": [2, 6],
  };

  for (const student of tkbStudents) {
    const [min, max] = scoreRanges[student.id] ?? [5, 9];
    for (const skillId of skillIds) {
      const score = rand(min, max);
      entryData.push({
        studentId: student.id,
        skillId,
        periodId: period.id,
        score,
        mappedCode: scoreToCode(score),
        isDraft: false,
      });
    }
  }

  for (const entry of entryData) {
    await prisma.progressEntry.upsert({
      where: { studentId_skillId_periodId: { studentId: entry.studentId, skillId: entry.skillId, periodId: entry.periodId } },
      update: {},
      create: entry,
    });
  }

  // ── Student period summaries ─────────────────────────────────────────────────
  const summaryTexts: Record<string, string> = {
    "stu-ayla": "Ayla had a fantastic semester! She shows exceptional language skills and loves group activities. Her confidence in taking initiative is truly inspiring for her classmates. Keep nurturing her creativity at home through art and storytelling.",
    "stu-bima": "Bima is making great progress this semester. He has shown strong social skills and enjoys helping his friends. His math understanding is developing well. Encourage him to practice fine motor activities like drawing and cutting at home.",
    "stu-caca": "Cahaya is a creative and imaginative child. She expresses herself beautifully through art and play. Her language skills are emerging nicely. We encourage more reading together at home to strengthen her vocabulary.",
    "stu-dira": "Dira is working hard and showing improvement every week. He is beginning to show more confidence in class. Some areas need more support at home — especially practicing counting and letter recognition through playful activities.",
  };

  for (const student of tkbStudents) {
    if (summaryTexts[student.id]) {
      await prisma.studentPeriodSummary.upsert({
        where: { studentId_periodId: { studentId: student.id, periodId: period.id } },
        update: {},
        create: {
          studentId: student.id,
          periodId: period.id,
          overallComment: summaryTexts[student.id],
          isPublished: student.id !== "stu-dira",
          publishedAt: student.id !== "stu-dira" ? new Date("2025-12-20") : null,
        },
      });
    }
  }

  // ── Attendance records ───────────────────────────────────────────────────────
  const attendanceDates = [
    "2025-07-14", "2025-07-15", "2025-07-16", "2025-07-17", "2025-07-18",
    "2025-07-21", "2025-07-22", "2025-07-23", "2025-07-24", "2025-07-25",
    "2025-07-28", "2025-07-29", "2025-07-30",
  ];

  const attendancePatterns: Record<string, string[]> = {
    "stu-ayla": ["present", "present", "present", "present", "present", "present", "present", "present", "present", "present", "present", "present", "present"],
    "stu-bima": ["present", "present", "sick", "present", "present", "present", "present", "present", "present", "present", "absent", "present", "present"],
    "stu-caca": ["present", "present", "present", "permission", "present", "present", "present", "present", "sick", "present", "present", "present", "present"],
    "stu-dira": ["present", "absent", "present", "present", "sick", "present", "present", "present", "present", "present", "present", "sick", "present"],
  };

  for (const student of tkbStudents) {
    const pattern = attendancePatterns[student.id] ?? attendanceDates.map(() => "present");
    for (let i = 0; i < attendanceDates.length; i++) {
      try {
        await prisma.attendanceRecord.upsert({
          where: { studentId_date: { studentId: student.id, date: new Date(attendanceDates[i]) } },
          update: {},
          create: {
            studentId: student.id,
            classId: classB.id,
            periodId: period.id,
            date: new Date(attendanceDates[i]),
            status: pattern[i] ?? "present",
          },
        });
      } catch (_) {}
    }
  }

  // ── Announcements ────────────────────────────────────────────────────────────
  await prisma.announcement.upsert({
    where: { id: "ann-1" },
    update: {},
    create: {
      id: "ann-1",
      title: "Semester 1 Reports Now Available",
      content: "Dear parents, Semester 1 report cards are now available for download. Please log in to the parent portal to view your child's progress and download the PDF. If you have any questions, please reach out to your child's homeroom teacher.",
      schoolId: school.id,
    },
  });

  await prisma.announcement.upsert({
    where: { id: "ann-2" },
    update: {},
    create: {
      id: "ann-2",
      title: "Year-End Celebration — December 20",
      content: "We invite all parents to join our Year-End Celebration on December 20, 2025 at 9:00 AM. Children will perform songs and present their artwork. Light refreshments will be served. Please RSVP to the school office by December 15.",
      schoolId: school.id,
    },
  });

  // ── Report card template ─────────────────────────────────────────────────────
  await prisma.reportCardTemplate.upsert({
    where: { id: "tmpl-tkcp" },
    update: {},
    create: {
      id: "tmpl-tkcp",
      name: "TK Cita Pelangi Template",
      schoolId: school.id,
      isActive: true,
      config: JSON.stringify({
        scale: { 0: "P", 4: "C", 7: "B" },
        domains: areaConfig.map((a) => ({
          id: a.id, name: a.name, customScale: a.customScale ?? false,
        })),
      }),
    },
  });

  console.log("✅ Seed complete!");
  console.log("\nDemo credentials (all use password: demo1234):");
  console.log("  Admin   → admin@tkcp.id");
  console.log("  Teacher → ms.devina@tkcp.id  (TK B homeroom + Bahasa/Inisiatif)");
  console.log("  Teacher → ms.ida@tkcp.id     (Motorik & Matematika)");
  console.log("  Teacher → ms.sarah@tkcp.id   (English)");
  console.log("  Parent  → parent.ayla@gmail.com  (Ayla's parent)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
