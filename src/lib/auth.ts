"use client";

import { UserAccount } from "@/types";

// Public sanitized profile models (Passwords are kept exclusively on the server)
export const ADMIN_USER: UserAccount = {
  id: "c70936b3-ffe8-4baa-908d-f92fbd62ca9a",
  fullName: "Shubh Pandey",
  email: "admin@mmmut.ac.in",
  role: "admin",
  degree: "B.Tech",
  branch: "Information Technology",
  branchCode: "IT",
  section: "SEC-B",
  batch: "P1",
  semester: "Semester I",
  academicSession: "2025-26",
  attendanceThreshold: 75.0,
  activeTimetableId: "mmmut-btech-it-b-2025",
};

export const TEMP_STUDENT_USER: UserAccount = {
  id: "temp-student-002",
  fullName: "Guest Student",
  email: "student@mmmut.ac.in",
  role: "student",
  degree: "B.Tech",
  branch: "Computer Science & Engineering",
  branchCode: "CSE",
  section: "SEC-A",
  batch: "P1",
  semester: "Semester I",
  academicSession: "2025-26",
  attendanceThreshold: 75.0,
  activeTimetableId: "mmmut-btech-cse-a-2025",
};

export const CLASS_ADMIN_USER: UserAccount = {
  id: "class-admin-aryan-003",
  fullName: "Aryan Singh (CR)",
  email: "cr.it@mmmut.ac.in",
  role: "class_admin",
  degree: "B.Tech",
  branch: "Information Technology",
  branchCode: "IT",
  section: "SEC-B",
  batch: "P1",
  semester: "Semester I",
  academicSession: "2025-26",
  attendanceThreshold: 75.0,
  activeTimetableId: "mmmut-btech-it-b-2025",
  managedBranchCode: "IT",
  managedSection: "SEC-B",
};

const AUTH_STORAGE_KEYS = {
  CURRENT_USER: "attendx_auth_current_user_v2",
  REGISTERED_USERS: "attendx_auth_registered_users_v2",
  SESSION_TOKEN: "attendx_auth_session_token_v2",
};

export function getSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_STORAGE_KEYS.SESSION_TOKEN);
}

export function setSessionToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(AUTH_STORAGE_KEYS.SESSION_TOKEN, token);
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEYS.SESSION_TOKEN);
  }
}

export function getRegisteredUsers(): UserAccount[] {
  if (typeof window === "undefined") return [ADMIN_USER];
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEYS.REGISTERED_USERS);
    if (raw) {
      const parsed: UserAccount[] = JSON.parse(raw);
      const hasAdmin = parsed.some((u) => u.email === ADMIN_USER.email);
      const updated = parsed.filter((u) => u.email === ADMIN_USER.email);
      if (!hasAdmin) updated.push(ADMIN_USER);
      return updated;
    }
  } catch (e) {
    console.error("Error reading registered users", e);
  }
  return [ADMIN_USER];
}

export function saveRegisteredUsers(users: UserAccount[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AUTH_STORAGE_KEYS.REGISTERED_USERS, JSON.stringify(users));
  } catch (e) {
    console.error("Error saving registered users", e);
  }
}

export function getCurrentUser(): UserAccount | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEYS.CURRENT_USER);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Error reading current user session", e);
  }
  return null;
}

export function setCurrentUser(user: UserAccount | null): void {
  if (typeof window === "undefined") return;
  try {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEYS.CURRENT_USER);
    }
  } catch (e) {
    console.error("Error updating session", e);
  }
}

/**
 * Authenticates user through secure server endpoint /api/auth/login
 * Accepts roll number (e.g. 2026011001) or university email (e.g. admin@mmmut.ac.in).
 */
export async function loginUser(
  identifier: string,
  password: string
): Promise<{
  success: boolean;
  user?: UserAccount;
  error?: string;
  requiresPasswordChange?: boolean;
}> {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });

    const data = await res.json();
    if (res.ok && data.success && data.user) {
      setCurrentUser(data.user);
      if (data.sessionToken) setSessionToken(data.sessionToken);
      return {
        success: true,
        user: data.user,
        requiresPasswordChange: Boolean(
          data.requiresPasswordChange || data.user.requiresPasswordChange
        ),
      };
    }
    return { success: false, error: data.error || "Invalid roll number/email or password." };
  } catch (err: any) {
    console.error("Login request error:", err);
    return { success: false, error: "Network error. Unable to connect to authentication server." };
  }
}

/**
 * Changes password through server endpoint /api/auth/rotate-password
 */
export async function rotatePassword(
  newPassword: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const token = getSessionToken();
    const res = await fetch("/api/auth/rotate-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ newPassword }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      const user = getCurrentUser();
      if (user) {
        user.requiresPasswordChange = false;
        user.passwordChangeConsumed = true;
        setCurrentUser(user);
      }
      return { success: true, message: data.message };
    }
    return { success: false, error: data.error || "Failed to update password." };
  } catch (err: any) {
    console.error("Rotate password error:", err);
    return { success: false, error: "Network error. Unable to reach server." };
  }
}

/**
 * Registers new student through secure server endpoint /api/auth/register
 */
export async function registerNewUser(
  data: Omit<UserAccount, "id"> & { password?: string }
): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await res.json();
    if (res.ok && result.success && result.user) {
      setCurrentUser(result.user);
      if (result.sessionToken) setSessionToken(result.sessionToken);
      const existing = getRegisteredUsers();
      saveRegisteredUsers([...existing, result.user]);
      return { success: true, user: result.user };
    }
    return { success: false, error: result.error || "Registration failed." };
  } catch (err: any) {
    console.error("Registration request error:", err);
    return { success: false, error: "Network error. Unable to reach server." };
  }
}

export function logoutUser(): void {
  setCurrentUser(null);
  setSessionToken(null);
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

export function promoteToClassAdmin(userId: string, branchCode: string, section: string): UserAccount[] {
  const current = getCurrentUser();
  if (!current || current.role !== "admin") {
    console.error("Security violation: Only administrators can appoint Class Admins.");
    return getRegisteredUsers();
  }

  const users = getRegisteredUsers();
  const updated = users.map((u) => {
    if (u.id === userId) {
      return {
        ...u,
        role: "class_admin" as const,
        managedBranchCode: branchCode,
        managedSection: section,
      };
    }
    return u;
  });
  saveRegisteredUsers(updated);

  if (current && current.id === userId) {
    setCurrentUser({
      ...current,
      role: "class_admin",
      managedBranchCode: branchCode,
      managedSection: section,
    });
  }
  return updated;
}

export function revokeClassAdmin(userId: string): UserAccount[] {
  const current = getCurrentUser();
  if (!current || current.role !== "admin") {
    console.error("Security violation: Only administrators can revoke Class Admins.");
    return getRegisteredUsers();
  }

  const users = getRegisteredUsers();
  const updated = users.map((u) => {
    if (u.id === userId) {
      return {
        ...u,
        role: "student" as const,
        managedBranchCode: undefined,
        managedSection: undefined,
      };
    }
    return u;
  });
  saveRegisteredUsers(updated);

  if (current && current.id === userId) {
    setCurrentUser({
      ...current,
      role: "student",
      managedBranchCode: undefined,
      managedSection: undefined,
    });
  }
  return updated;
}
