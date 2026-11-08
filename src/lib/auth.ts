"use client";

import { UserAccount } from "@/types";

// Public sanitized profile storage keys
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
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEYS.REGISTERED_USERS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Error reading registered users", e);
  }
  return [];
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
 * Accepts roll number (e.g. 2026011001) or enrollment number (e.g. 2026CED0377).
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
    return { success: false, error: data.error || "Invalid roll number or enrollment number, or password." };
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
      if (data.sessionToken) {
        setSessionToken(data.sessionToken);
      }
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
