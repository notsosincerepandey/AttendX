import {
  StudentProfile,
  UniversityTimetable,
  TimetableSlot,
  DateSpecificOverride,
  DateOverrideType,
} from "@/types";
import { getActiveTimetable } from "@/lib/storage";

// Storage keys
export function getPersonalOverridesKey(userId: string): string {
  return `attendx_timetable_overrides_user_${userId}`;
}

export function getClassOverridesKey(branchCode: string, section: string): string {
  return `attendx_timetable_overrides_class_${branchCode}_${section}`;
}

/**
 * Retrieve personal date-specific overrides from localStorage.
 */
export function getPersonalOverrides(userId?: string): DateSpecificOverride[] {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const raw = localStorage.getItem(getPersonalOverridesKey(userId));
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error("Error loading personal timetable overrides:", err);
  }
  return [];
}

/**
 * Save personal date-specific override to localStorage.
 */
export function savePersonalOverride(userId: string, override: DateSpecificOverride): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    const existing = getPersonalOverrides(userId);
    const filtered = existing.filter((o) => o.id !== override.id);
    filtered.push(override);
    localStorage.setItem(getPersonalOverridesKey(userId), JSON.stringify(filtered));
  } catch (err) {
    console.error("Error saving personal timetable override:", err);
  }
}

/**
 * Delete personal date-specific override by ID.
 */
export function deletePersonalOverride(userId: string, overrideId: string): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    const existing = getPersonalOverrides(userId);
    const filtered = existing.filter((o) => o.id !== overrideId);
    localStorage.setItem(getPersonalOverridesKey(userId), JSON.stringify(filtered));
  } catch (err) {
    console.error("Error deleting personal timetable override:", err);
  }
}

/**
 * Retrieve class-wide date-specific overrides published by CR or Admin.
 */
export function getClassOverrides(branchCode?: string, section?: string): DateSpecificOverride[] {
  if (typeof window === "undefined" || !branchCode || !section) return [];
  try {
    const raw = localStorage.getItem(getClassOverridesKey(branchCode, section));
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error("Error loading class timetable overrides:", err);
  }
  return [];
}

/**
 * Save class-wide date-specific override published by CR or Admin.
 */
export function saveClassOverride(branchCode: string, section: string, override: DateSpecificOverride): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getClassOverrides(branchCode, section);
    const filtered = existing.filter((o) => o.id !== override.id);
    filtered.push(override);
    localStorage.setItem(getClassOverridesKey(branchCode, section), JSON.stringify(filtered));
  } catch (err) {
    console.error("Error saving class timetable override:", err);
  }
}

/**
 * Delete class-wide date-specific override by ID.
 */
export function deleteClassOverride(branchCode: string, section: string, overrideId: string): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getClassOverrides(branchCode, section);
    const filtered = existing.filter((o) => o.id !== overrideId);
    localStorage.setItem(getClassOverridesKey(branchCode, section), JSON.stringify(filtered));
  } catch (err) {
    console.error("Error deleting class timetable override:", err);
  }
}

/**
 * Get all overrides applicable to a student on a specific date.
 */
export function getAllOverridesForStudent(
  profile: StudentProfile | null,
  dateStr?: string
): DateSpecificOverride[] {
  if (!profile) return [];
  const personal = getPersonalOverrides(profile.id);
  const classWide = getClassOverrides(profile.branchCode, profile.section);

  const combined = [...personal, ...classWide];
  if (!dateStr) return combined;
  return combined.filter((o) => o.date === dateStr);
}

export interface EffectiveSlotsOptions {
  timetable?: UniversityTimetable | null;
  overrides?: DateSpecificOverride[];
  batch?: string;
  includeCancelled?: boolean;
}

/**
 * Resolves the authoritative list of timetable slots for an exact date.
 * Combines:
 * 1. Base recurring weekly timetable matching that weekday.
 * 2. Minus date-specific cancelled occurrences (Remove this occurrence only).
 * 3. Plus date-specific one-time extra classes (This day only).
 * 4. Plus rescheduled occurrences.
 *
 * Strict isolation:
 * - Extra classes for P1 will never appear for P2.
 * - One-time classes only appear on their exact date and never on other weeks.
 * - Recurring schedules remain intact.
 */
export function getEffectiveSlotsForDate(
  profile: StudentProfile | null,
  dateStr: string,
  options?: EffectiveSlotsOptions
): TimetableSlot[] {
  if (!profile) return [];

  // Parse day of week from dateStr (YYYY-MM-DD)
  // Ensure date parsing uses local midnight to avoid timezone shifts
  const [year, month, day] = dateStr.split("-").map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" });

  const effectiveBatch = options?.batch || profile.batch || "ALL";
  const baseTimetable = options?.timetable !== undefined ? options.timetable : getActiveTimetable(profile);

  // 1. Start with base recurring slots for this weekday
  let activeSlots: TimetableSlot[] = [];
  if (baseTimetable && Array.isArray(baseTimetable.slots)) {
    activeSlots = baseTimetable.slots
      .filter((s) => {
        // Exclude one-time slots from recurring weekly schedule
        if (s.isOneTime) return false;
        if (s.day !== dayName) return false;
        if (effectiveBatch === "ALL") return true;
        return s.batch === "ALL" || s.batch === effectiveBatch;
      })
      .map((s) => ({ ...s, status: "SCHEDULED" as const }));
  }

  // 2. Fetch applicable overrides for this exact date
  const dateOverrides = options?.overrides
    ? options.overrides.filter((o) => o.date === dateStr)
    : getAllOverridesForStudent(profile, dateStr);

  // 3. Process CANCEL_OCCURRENCE overrides
  const cancellations = dateOverrides.filter((o) => o.type === "CANCEL_OCCURRENCE");
  for (const canc of cancellations) {
    // Check if cancellation applies to student's batch
    if (canc.batch !== "ALL" && effectiveBatch !== "ALL" && canc.batch !== effectiveBatch) {
      continue;
    }

    if (options?.includeCancelled) {
      // Mark matching slot as CANCELLED
      activeSlots = activeSlots.map((s) => {
        const matchesPeriod = s.period === canc.originalPeriod;
        const matchesSubject = !canc.originalSubjectCode || s.subjectCode === canc.originalSubjectCode;
        const matchesSlotId = !canc.originalSlotId || s.id === canc.originalSlotId;
        if (matchesPeriod && (matchesSubject || matchesSlotId)) {
          return { ...s, status: "CANCELLED" as const };
        }
        return s;
      });
    } else {
      // Filter out cancelled slot
      activeSlots = activeSlots.filter((s) => {
        const matchesPeriod = s.period === canc.originalPeriod;
        const matchesSubject = !canc.originalSubjectCode || s.subjectCode === canc.originalSubjectCode;
        const matchesSlotId = !canc.originalSlotId || s.id === canc.originalSlotId;
        return !(matchesPeriod && (matchesSubject || matchesSlotId));
      });
    }
  }

  // 4. Process RESCHEDULE_OCCURRENCE overrides
  const reschedules = dateOverrides.filter((o) => o.type === "RESCHEDULE_OCCURRENCE" && o.slot);
  for (const resch of reschedules) {
    if (resch.batch !== "ALL" && effectiveBatch !== "ALL" && resch.batch !== effectiveBatch) {
      continue;
    }
    // Remove original slot
    activeSlots = activeSlots.filter((s) => {
      const matchesPeriod = s.period === resch.originalPeriod;
      const matchesSubject = !resch.originalSubjectCode || s.subjectCode === resch.originalSubjectCode;
      return !(matchesPeriod && matchesSubject);
    });
    // Add rescheduled slot
    if (resch.slot) {
      activeSlots.push({
        ...resch.slot,
        day: dayName,
        isOneTime: true,
        specificDate: dateStr,
        occurrenceId: resch.slot.occurrenceId || resch.id,
        overrideId: resch.id,
        status: "RESCHEDULED",
      });
    }
  }

  // 5. Process EXTRA_CLASS overrides (one-time classes for this exact date)
  const extraClasses = dateOverrides.filter((o) => o.type === "EXTRA_CLASS" && o.slot);
  for (const extra of extraClasses) {
    if (extra.batch !== "ALL" && effectiveBatch !== "ALL" && extra.batch !== effectiveBatch) {
      continue;
    }
    if (extra.slot) {
      activeSlots.push({
        ...extra.slot,
        day: dayName,
        isOneTime: true,
        specificDate: dateStr,
        occurrenceId: extra.slot.occurrenceId || `extra-${dateStr}-p${extra.slot.period}-${extra.slot.subjectCode}`,
        overrideId: extra.id,
        status: "SCHEDULED",
      });
    }
  }

  // 6. Sort slots by period ascending
  return activeSlots.sort((a, b) => a.period - b.period);
}
