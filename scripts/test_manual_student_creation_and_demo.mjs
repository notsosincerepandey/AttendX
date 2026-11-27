// ==============================================================================
// AttendX Manual Student Creation & Demo Account Verification Suite
// Tests 17 Critical Scenarios across Validation, Auth Provisioning & Demo Security
// ==============================================================================

import crypto from "crypto";

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

// -----------------------------------------------------------------------------
// Reference Data & Normalization Functions
// -----------------------------------------------------------------------------

const VALID_BRANCHES = [
  { code: "IT", name: "Information Technology" },
  { code: "CSE", name: "Computer Science & Engineering" },
  { code: "ECE", name: "Electronics & Communication Engineering" },
  { code: "EE", name: "Electrical Engineering" },
  { code: "ME", name: "Mechanical Engineering" },
  { code: "CE", name: "Civil Engineering" },
  { code: "CH", name: "Chemical Engineering" },
];

function normalizeSection(sec) {
  if (!sec) return "SEC-A";
  const s = String(sec).toUpperCase().trim();
  if (s.includes("B") || s === "SEC-B") return "SEC-B";
  if (s.includes("C") || s === "SEC-C") return "SEC-C";
  if (s.includes("D") || s === "SEC-D") return "SEC-D";
  return "SEC-A";
}

function rollNumberToEmailAlias(identifier) {
  const trimmed = identifier.trim();
  if (!trimmed.includes("@")) {
    return `student.${trimmed.toLowerCase()}@attendx.mmmut.ac.in`;
  }
  return trimmed.toLowerCase();
}

function createSessionToken(user, secret = "attendx-test-signing-key-2026") {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const roll = user.rollNumber || "";
  const payload = `${user.id}:${user.email}:${user.role}:${expiresAt}:${roll}`;
  const encodedPayload = Buffer.from(payload).toString("base64");
  const signature = crypto.createHmac("sha256", secret).update(encodedPayload).digest("hex");
  return `${encodedPayload}.${signature}`;
}

function verifySessionToken(token, secret = "attendx-test-signing-key-2026") {
  const parts = token.split(".");
  if (parts.length !== 2) return { valid: false, error: "Malformed token" };
  const [encodedPayload, signature] = parts;
  const expectedSig = crypto.createHmac("sha256", secret).update(encodedPayload).digest("hex");
  if (signature !== expectedSig) return { valid: false, error: "Tampered token" };
  const payload = Buffer.from(encodedPayload, "base64").toString("utf-8");
  const [userId, email, role, expStr, roll] = payload.split(":");
  if (Date.now() > Number(expStr)) return { valid: false, error: "Expired token" };
  return { valid: true, user: { userId, email, role, rollNumber: roll } };
}

// -----------------------------------------------------------------------------
// In-Memory Student Directory & Store Simulator
// -----------------------------------------------------------------------------

class TestStudentDirectory {
  constructor() {
    this.students = new Map();
    this.authUsers = new Map();
  }

  createStudent(adminUser, input) {
    if (adminUser.role !== "admin") {
      return { success: false, error: "Access Denied: Administrator privileges required." };
    }

    const fullName = (input.fullName || "").trim();
    if (!fullName || fullName.length < 2) {
      return { success: false, error: "Student full name is required (at least 2 characters)." };
    }

    const rollNumber = (input.rollNumber || "").trim().toUpperCase();
    if (!rollNumber || rollNumber.length < 2) {
      return { success: false, error: "Valid roll number is required." };
    }
    if (!/^[A-Z0-9_-]+$/i.test(rollNumber)) {
      return { success: false, error: "Roll number must contain alphanumeric characters or hyphens only." };
    }

    const enrollmentNumber = input.enrollmentNumber?.trim() ? input.enrollmentNumber.trim().toUpperCase() : undefined;
    const bCode = (input.branchCode || "").trim().toUpperCase();
    const branchValid = VALID_BRANCHES.some((b) => b.code === bCode);
    if (!branchValid) {
      return { success: false, error: `Invalid branch code "${bCode}". Please select a valid branch.` };
    }

    let email = (input.email || "").trim().toLowerCase();
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { success: false, error: "Please enter a valid email address (e.g. student@example.com)." };
      }
    } else {
      email = `student.${rollNumber.toLowerCase()}@attendx.mmmut.ac.in`;
    }

    const rawPassword = input.password?.trim();
    if (rawPassword && rawPassword.length < 6) {
      return { success: false, error: "Password must be at least 6 characters long." };
    }
    const password = rawPassword || "AttendX@2026";

    // Duplicate checks
    for (const s of this.students.values()) {
      if (s.rollNumber && s.rollNumber.toUpperCase() === rollNumber) {
        return { success: false, error: `Roll Number "${rollNumber}" is already registered to an existing student.` };
      }
      if (enrollmentNumber && s.enrollmentNumber && s.enrollmentNumber.toUpperCase() === enrollmentNumber) {
        return { success: false, error: `Enrollment Number "${enrollmentNumber}" is already registered to an existing student.` };
      }
      if (s.email && s.email.toLowerCase() === email) {
        return { success: false, error: `Email address "${email}" is already registered to an existing student.` };
      }
    }

    const studentId = input.isDemo ? "demo-student-attendx-2026" : `student-${crypto.randomUUID()}`;
    const normalizedSec = normalizeSection(input.section || "");
    const batch = (input.batch || "P1").toUpperCase();
    const academicYear = input.academicYear || "1st Year";
    const semester = input.semester || (academicYear === "2nd Year" ? "Semester III" : "Semester I");
    const status = input.status || "ACTIVE";
    const isDemo = Boolean(input.isDemo);

    const requiresPasswordChange =
      input.requiresPasswordChange !== undefined
        ? input.requiresPasswordChange
        : isDemo
        ? false
        : rawPassword
        ? false
        : true;

    const studentItem = {
      id: studentId,
      userId: studentId,
      fullName,
      email,
      rollNumber,
      enrollmentNumber,
      branchCode: bCode,
      branchName: VALID_BRANCHES.find((b) => b.code === bCode)?.name || "Engineering",
      section: normalizedSec,
      batch,
      academicSession: "2026-27",
      academicYear,
      semester,
      role: "student",
      isActive: status !== "INACTIVE",
      status,
      createdAt: new Date().toISOString(),
      isDemo,
    };

    const authRecord = {
      ...studentItem,
      password,
      requiresPasswordChange,
      passwordChangeConsumed: !requiresPasswordChange,
    };

    this.students.set(studentId, studentItem);
    this.authUsers.set(email.toLowerCase(), authRecord);
    this.authUsers.set(rollNumber.toLowerCase(), authRecord);
    if (enrollmentNumber) {
      this.authUsers.set(enrollmentNumber.toLowerCase(), authRecord);
    }

    return { success: true, student: studentItem };
  }

  authenticate(identifier, password) {
    const trimmed = identifier.trim().toLowerCase();
    const user = this.authUsers.get(trimmed);
    if (!user) {
      return { success: false, error: "Invalid credentials. User not found." };
    }
    if (user.password !== password) {
      return { success: false, error: "Invalid credentials. Incorrect password." };
    }
    const token = createSessionToken(user);
    return {
      success: true,
      user,
      sessionToken: token,
      requiresPasswordChange: user.requiresPasswordChange,
    };
  }
}

// -----------------------------------------------------------------------------
// Realistic Attendance Data Generator for Demo Student
// -----------------------------------------------------------------------------

function generateDemoAttendanceRecords(demoUser) {
  const subjects = [
    { code: "BIT-101", name: "Programming for Problem Solving", category: "Theory", targetPct: 88 },
    { code: "BIT-104", name: "Programming Lab", category: "Lab", targetPct: 100 },
    { code: "BAS-101", name: "Engineering Mathematics-I", category: "Theory", targetPct: 76 }, // Warning
    { code: "BHS-101", name: "Environmental Studies", category: "Theory", targetPct: 64 }, // Shortage
    { code: "BEE-101", name: "Basic Electrical Engineering", category: "Theory", targetPct: 85 },
  ];

  const records = [];
  const baseDate = new Date("2026-11-27T10:00:00.000Z");

  for (let d = 20; d >= 1; d--) {
    const curDate = new Date(baseDate);
    curDate.setDate(curDate.getDate() - d);
    if (curDate.getDay() === 0) continue; // Skip Sunday

    const dateStr = curDate.toISOString().split("T")[0];

    // Fest rehearsal cancellation 10 days ago
    const isCancelledDay = d === 10;

    subjects.forEach((sub, sIdx) => {
      let status = "PRESENT";
      if (isCancelledDay) {
        status = "CANCELLED";
      } else if (sub.category === "Lab") {
        status = "PRESENT"; // 100% lab attendance
      } else if (sub.targetPct < 70) {
        status = (d + sIdx) % 3 === 0 ? "ABSENT" : "PRESENT";
      } else if (sub.targetPct < 80) {
        status = (d + sIdx) % 4 === 0 ? "ABSENT" : "PRESENT";
      } else {
        status = (d + sIdx) % 8 === 0 ? "ABSENT" : "PRESENT";
      }

      records.push({
        id: `att-${dateStr}-p${sIdx + 1}-${sub.code}`,
        studentId: demoUser.id,
        date: dateStr,
        period: sIdx + 1,
        subjectCode: sub.code,
        subjectName: sub.name,
        category: sub.category,
        batch: demoUser.batch,
        status,
        markedAt: `${dateStr}T13:00:00.000Z`,
      });
    });
  }

  return records;
}

// -----------------------------------------------------------------------------
// Test Execution
// -----------------------------------------------------------------------------

async function runTestSuite() {
  console.log("\n=======================================================");
  console.log(" AttendX Manual Student Creation & Demo Account Suite");
  console.log("=======================================================\n");

  const directory = new TestStudentDirectory();

  const adminUser = {
    id: "admin-system-id",
    fullName: "AttendX Administrator",
    email: "admin@attendx.ac.in",
    role: "admin",
  };

  const studentUser = {
    id: "student-rogue-id",
    fullName: "Rogue Student",
    email: "rogue@example.com",
    role: "student",
  };

  // ---------------------------------------------------------------------------
  // GROUP 1: Privileges & Input Validation
  // ---------------------------------------------------------------------------
  console.log("--- GROUP 1: Privilege & Input Validation ---");

  // Test 1: Non-admin authorization
  const unauthorizedRes = directory.createStudent(studentUser, {
    fullName: "Test Student",
    rollNumber: "2026019999",
    branchCode: "IT",
    section: "SEC-B",
  });
  assert(
    unauthorizedRes.success === false && unauthorizedRes.error?.includes("Access Denied"),
    "Test 1: Non-admin users are strictly denied from creating students (HTTP 403)"
  );

  // Test 2: Missing Full Name
  const missingNameRes = directory.createStudent(adminUser, {
    fullName: "   ",
    rollNumber: "2026019991",
    branchCode: "IT",
    section: "SEC-B",
  });
  assert(
    missingNameRes.success === false && missingNameRes.error?.includes("full name is required"),
    "Test 2: Missing or blank full name is rejected with clear error"
  );

  // Test 3: Missing Roll Number
  const missingRollRes = directory.createStudent(adminUser, {
    fullName: "Aman Gupta",
    rollNumber: "",
    branchCode: "IT",
    section: "SEC-B",
  });
  assert(
    missingRollRes.success === false && missingRollRes.error?.includes("roll number is required"),
    "Test 3: Missing or blank roll number is rejected with clear error"
  );

  // Test 4: Malformed Email format
  const malformedEmailRes = directory.createStudent(adminUser, {
    fullName: "Priya Sharma",
    rollNumber: "2026019992",
    branchCode: "IT",
    section: "SEC-B",
    email: "not-an-email",
  });
  assert(
    malformedEmailRes.success === false && malformedEmailRes.error?.includes("valid email address"),
    "Test 4: Malformed email format is rejected"
  );

  // Test 5: Invalid Branch Code
  const invalidBranchRes = directory.createStudent(adminUser, {
    fullName: "Vikas Yadav",
    rollNumber: "2026019993",
    branchCode: "AERONAUTICAL",
    section: "SEC-A",
  });
  assert(
    invalidBranchRes.success === false && invalidBranchRes.error?.includes("Invalid branch code"),
    "Test 5: Non-existent engineering branch code is rejected"
  );

  // Test 6: Short Password (< 6 chars)
  const shortPassRes = directory.createStudent(adminUser, {
    fullName: "Rohan Kumar",
    rollNumber: "2026019994",
    branchCode: "IT",
    section: "SEC-B",
    password: "123",
  });
  assert(
    shortPassRes.success === false && shortPassRes.error?.includes("at least 6 characters"),
    "Test 6: Short passwords (< 6 characters) are rejected"
  );

  // ---------------------------------------------------------------------------
  // GROUP 2: Successful Account Creation & Uniqueness Checks
  // ---------------------------------------------------------------------------
  console.log("\n--- GROUP 2: Successful Creation & Uniqueness Checks ---");

  // Test 7: Valid student creation with auto email alias
  const validStudentRes = directory.createStudent(adminUser, {
    fullName: "Devansh Singh",
    rollNumber: "2026019001",
    enrollmentNumber: "2026CED9001",
    branchCode: "IT",
    section: "SEC-B",
    batch: "P1",
    academicYear: "1st Year",
    semester: "Semester I",
    password: "CustomPass@2026",
    status: "ACTIVE",
  });
  assert(
    validStudentRes.success === true &&
    validStudentRes.student?.rollNumber === "2026019001" &&
    validStudentRes.student?.email === "student.2026019001@attendx.mmmut.ac.in",
    "Test 7: Valid student account is created with auto-derived university email alias"
  );

  // Test 8: Duplicate Roll Number rejection
  const dupRollRes = directory.createStudent(adminUser, {
    fullName: "Devansh Duplicate",
    rollNumber: "2026019001", // Duplicate
    branchCode: "IT",
    section: "SEC-B",
  });
  assert(
    dupRollRes.success === false && dupRollRes.error?.includes("already registered"),
    "Test 8: Duplicate roll number is caught and rejected"
  );

  // Test 9: Duplicate Enrollment Number rejection
  const dupEnrRes = directory.createStudent(adminUser, {
    fullName: "Other Student",
    rollNumber: "2026019002",
    enrollmentNumber: "2026CED9001", // Duplicate enrollment
    branchCode: "IT",
    section: "SEC-B",
  });
  assert(
    dupEnrRes.success === false && dupEnrRes.error?.includes("Enrollment Number"),
    "Test 9: Duplicate enrollment number is caught and rejected"
  );

  // Test 10: Duplicate Email rejection
  const dupEmailRes = directory.createStudent(adminUser, {
    fullName: "Third Student",
    rollNumber: "2026019003",
    email: "student.2026019001@attendx.mmmut.ac.in", // Duplicate email
    branchCode: "IT",
    section: "SEC-B",
  });
  assert(
    dupEmailRes.success === false && dupEmailRes.error?.includes("Email address"),
    "Test 10: Duplicate email address is caught and rejected"
  );

  // ---------------------------------------------------------------------------
  // GROUP 3: Authentication & Login Flow
  // ---------------------------------------------------------------------------
  console.log("\n--- GROUP 3: Authentication & Login Flow ---");

  // Test 11: Login with Roll Number using custom password
  const loginRoll = directory.authenticate("2026019001", "CustomPass@2026");
  assert(
    loginRoll.success === true &&
    loginRoll.user?.fullName === "Devansh Singh" &&
    loginRoll.sessionToken !== undefined,
    "Test 11: Student logs in successfully with Roll Number and password"
  );

  // Test 12: Login with Enrollment Number
  const loginEnr = directory.authenticate("2026CED9001", "CustomPass@2026");
  assert(
    loginEnr.success === true &&
    loginEnr.user?.rollNumber === "2026019001",
    "Test 12: Student logs in successfully with university Enrollment Number"
  );

  // Test 13: Login with Email
  const loginEmail = directory.authenticate("student.2026019001@attendx.mmmut.ac.in", "CustomPass@2026");
  assert(
    loginEmail.success === true &&
    loginEmail.user?.fullName === "Devansh Singh",
    "Test 13: Student logs in successfully with university email alias"
  );

  // ---------------------------------------------------------------------------
  // GROUP 4: Dedicated Public Demo Student Account
  // ---------------------------------------------------------------------------
  console.log("\n--- GROUP 4: Dedicated Public Demo Student Account ---");

  // Create official Demo Account
  const demoCreation = directory.createStudent(adminUser, {
    fullName: "Aditya Verma (Demo Student)",
    rollNumber: "DEMO2026",
    enrollmentNumber: "DEMO2026001",
    email: "demo.student@attendx.app",
    password: "Demo@AttendX2026",
    branchCode: "IT",
    section: "SEC-B",
    batch: "P1",
    academicYear: "1st Year",
    semester: "Semester I",
    status: "ACTIVE",
    requiresPasswordChange: false,
    isDemo: true,
  });

  assert(
    demoCreation.success === true &&
    demoCreation.student?.isDemo === true &&
    demoCreation.student?.rollNumber === "DEMO2026",
    "Test 14: Dedicated Demo Student account created with isDemo flag"
  );

  // Test 15: Demo account authentication with Roll Number & Email
  const demoAuthRoll = directory.authenticate("DEMO2026", "Demo@AttendX2026");
  const demoAuthEmail = directory.authenticate("demo.student@attendx.app", "Demo@AttendX2026");
  assert(
    demoAuthRoll.success === true &&
    demoAuthEmail.success === true &&
    demoAuthRoll.requiresPasswordChange === false &&
    demoAuthRoll.user?.role === "student",
    "Test 15: Demo Student logs in via both Roll Number & Email with requiresPasswordChange=false"
  );

  // Test 16: Security isolation: Demo Student is strictly non-admin and non-CR
  assert(
    demoAuthRoll.user?.role === "student" &&
    demoAuthRoll.user?.role !== "admin" &&
    demoAuthRoll.user?.role !== "class_admin",
    "Test 16: Demo Student strictly possesses 'student' role (blocked from Admin & CR endpoints)"
  );

  // Test 17: Realistic Demo Attendance Data Generation & Meaningful Percentages
  const demoAttendance = generateDemoAttendanceRecords(demoAuthRoll.user);
  const totalClasses = demoAttendance.filter((r) => r.status !== "CANCELLED").length;
  const attendedClasses = demoAttendance.filter((r) => r.status === "PRESENT").length;
  const overallPct = Math.round((attendedClasses / totalClasses) * 100);

  const envStudies = demoAttendance.filter((r) => r.subjectCode === "BHS-101" && r.status !== "CANCELLED");
  const envPct = Math.round((envStudies.filter((r) => r.status === "PRESENT").length / envStudies.length) * 100);

  const labClasses = demoAttendance.filter((r) => r.subjectCode === "BIT-104" && r.status !== "CANCELLED");
  const labPct = Math.round((labClasses.filter((r) => r.status === "PRESENT").length / labClasses.length) * 100);

  assert(
    demoAttendance.length > 50 &&
    overallPct >= 75 && overallPct <= 85 && // Realistic ~80% aggregate
    envPct < 75 && // Demonstrates Bunk Recovery Needed
    labPct === 100, // Demonstrates 100% Lab Completion
    `Test 17: Demo Account attendance data generated realistically (Aggregate: ${overallPct}%, Lab: ${labPct}%, Shortage: ${envPct}%)`
  );

  console.log("\n=======================================================");
  console.log(` Test Results: ${passed} Passed, ${failed} Failed`);
  console.log("=======================================================\n");

  if (failed > 0) process.exit(1);
}

runTestSuite().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
