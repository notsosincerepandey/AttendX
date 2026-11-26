"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { StudentProfile, TimetableSlot } from "@/types";
import { getStoredProfile, getActiveTimetable, getTodayDateStr } from "@/lib/storage";
import {
  isPushNotificationSupported,
  getNotificationPermission,
  getExistingPushSubscription,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  triggerTestPushNotification,
  isBraveBrowser,
} from "@/lib/pushClient";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Smartphone,
  Laptop,
  Apple,
  Info,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  Send,
  RefreshCw,
  ExternalLink,
  Check,
  X,
  Volume2,
  VolumeX,
} from "lucide-react";
import RadialNavWheel from "@/components/RadialNavWheel";

export default function NotificationSettingsPage() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subEndpoint, setSubEndpoint] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
    deadlineTime?: string;
  } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isBrave, setIsBrave] = useState(false);
  const [activeWindowDeadline, setActiveWindowDeadline] = useState<string | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);

  // Selected class for test notification
  const [testPeriod, setTestPeriod] = useState(2);
  const [testSubjectCode, setTestSubjectCode] = useState("BIT-103");
  const [testCategory, setTestCategory] = useState("Theory");

  useEffect(() => {
    const prof = getStoredProfile();
    setProfile(prof);

    const supported = isPushNotificationSupported();
    setIsSupported(supported);
    setPermission(getNotificationPermission());
    isBraveBrowser().then((val) => setIsBrave(val));

    const checkSubscription = async () => {
      const existing = await getExistingPushSubscription();
      if (existing) {
        setIsSubscribed(true);
        setSubEndpoint(existing.endpoint);
      } else {
        setIsSubscribed(false);
        setSubEndpoint(null);
      }
    };

    checkSubscription();
  }, []);

  // Countdown timer for active 5-minute window
  useEffect(() => {
    if (!activeWindowDeadline) {
      setCountdownSeconds(null);
      return;
    }

    const interval = setInterval(() => {
      const deadline = new Date(activeWindowDeadline).getTime();
      const now = new Date().getTime();
      const remaining = Math.max(0, Math.floor((deadline - now) / 1000));
      setCountdownSeconds(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeWindowDeadline]);

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const timetable = getActiveTimetable(profile);
  if (!timetable) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-center space-y-4">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          Timetable Mapping Not Found
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No official timetable is currently mapped for branch {profile.branch} ({profile.branchCode}), section {profile.section}.
        </p>
      </div>
    );
  }
  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });

  const todaySlots = timetable.slots
    .filter((s) => s.day === dayName && (s.batch === "ALL" || s.batch === profile.batch))
    .sort((a, b) => a.period - b.period);

  const handleSubscribe = async () => {
    setIsLoading(true);
    setTestResult(null);

    const res = await subscribeToPushNotifications(profile.id);
    setIsLoading(false);

    setPermission(getNotificationPermission());
    if (res.success && res.subscription) {
      setIsSubscribed(true);
      setSubEndpoint(res.subscription.endpoint);
      setTestResult({
        success: true,
        message: "Push notifications successfully enabled on this browser! Test below.",
      });
    } else {
      setTestResult({
        success: false,
        error: res.error || "Failed to enable notifications.",
      });
    }
  };

  const handleUnsubscribe = async () => {
    setIsLoading(true);
    await unsubscribeFromPushNotifications(profile.id);
    setIsLoading(false);
    setIsSubscribed(false);
    setSubEndpoint(null);
    setTestResult({
      success: true,
      message: "Push notifications disabled on this device.",
    });
  };

  const handleSendTestPush = async () => {
    setIsLoading(true);
    setTestResult(null);

    const matchedSlot = timetable.slots.find((s) => s.period === testPeriod) || todaySlots[0];

    const res = await triggerTestPushNotification(profile.id, {
      subjectName: matchedSlot ? matchedSlot.subjectName : "Programming in C",
      subjectCode: matchedSlot ? matchedSlot.subjectCode : testSubjectCode,
      period: testPeriod,
      category: testCategory,
      batch: profile.batch,
      room: matchedSlot ? matchedSlot.room : timetable.room,
      section: profile.section,
    });

    setIsLoading(false);
    setTestResult(res);

    if (res.success && res.deadlineTime) {
      setActiveWindowDeadline(res.deadlineTime);
    }
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="futuristic-card p-6 rounded-2xl border border-white/[0.08] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              Web Push Technology
            </span>
            <span className="text-xs text-zinc-500 font-medium">
              Autonomous Actionable Attendance
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Class Notifications & Quick-Marking
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Receive automated alerts at class start time. Mark yourself <b>Present</b> or <b>Absent</b> directly from your device notification panel without opening the website.
          </p>
        </div>

        {/* Global Status Pill */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          {isSubscribed ? (
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Notifications Active
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-xs font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-zinc-400" />
              Not Subscribed
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Onboarding & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Setup, Permission & Live Testing */}
        <div className="lg:col-span-2 space-y-6">
          {/* Permission & Subscription Onboarding Card */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                Browser Permission & Web Push Setup
              </h2>
              <span className="text-[10px] font-mono text-zinc-400">
                VAPID Push Protocol
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Permission Status */}
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700 space-y-1">
                <span className="text-zinc-400 block text-[10px] uppercase font-bold tracking-wider">
                  Notification Permission
                </span>
                <div className="flex items-center gap-2 font-bold text-sm">
                  {permission === "granted" ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Check className="w-4 h-4" /> Granted
                    </span>
                  ) : permission === "denied" ? (
                    <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                      <X className="w-4 h-4" /> Blocked / Denied
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" /> Not Requested Yet
                    </span>
                  )}
                </div>
              </div>

              {/* Service Worker Status */}
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700 space-y-1">
                <span className="text-zinc-400 block text-[10px] uppercase font-bold tracking-wider">
                  Push Service Worker
                </span>
                <div className="flex items-center gap-2 font-bold text-sm">
                  {isSupported ? (
                    <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                      <Check className="w-4 h-4" /> Registered (/sw.js)
                    </span>
                  ) : (
                    <span className="text-rose-600 flex items-center gap-1">
                      <X className="w-4 h-4" /> Unsupported
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Permission Denied Warning */}
            {permission === "denied" && (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-900 dark:text-rose-200 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600" /> Notifications are blocked in your browser settings
                </div>
                <p>
                  To receive class alerts, click the lock/tune icon <span className="font-mono bg-white/60 dark:bg-black/40 px-1 rounded">🔒</span> in your browser address bar &rarr; change <b>Notifications</b> to <b>Allow</b> &rarr; reload this page.
                </p>
              </div>
            )}

            {/* Brave Browser Shield Notice */}
            {isBrave && !isSubscribed && (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-amber-600" /> Brave Browser Setup Tip
                </div>
                <p>
                  Brave disables Google push messaging by default. If push registration fails, open <span className="font-mono bg-white/60 dark:bg-black/40 px-1 rounded">brave://settings/privacy</span>, turn <b>ON</b> &quot;Use Google services for push messaging&quot;, and relaunch Brave.
                </p>
              </div>
            )}

            {/* Subscription Button Action */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="text-xs text-zinc-500">
                {isSubscribed ? (
                  <span>Device is paired to receive class start notifications.</span>
                ) : (
                  <span>Click below to grant permission and pair this browser.</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isSubscribed ? (
                  <button
                    onClick={handleUnsubscribe}
                    disabled={isLoading}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 transition-colors"
                  >
                    Disable on this device
                  </button>
                ) : (
                  <button
                    onClick={handleSubscribe}
                    disabled={isLoading}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/25 transition-all flex items-center gap-2"
                  >
                    <Bell className="w-4 h-4" /> Enable Attendance Notifications
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Actionable Notification Live Tester */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  Live Actionable Notification Tester
                </h3>
                <p className="text-xs text-zinc-500">
                  Simulate a class starting right now. Click <b>[PRESENT]</b> or <b>[ABSENT]</b> on the incoming notification!
                </p>
              </div>
            </div>

            {/* Notification Simulator Preview Card */}
            <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-50/70 to-purple-50/40 dark:from-indigo-950/30 dark:to-purple-950/20 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                  ATTENDX – CLASS STARTED
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">Just Now</span>
              </div>

              <div className="text-xs text-zinc-800 dark:text-zinc-200 font-medium leading-relaxed pl-1">
                <div>
                  <b className="text-sm text-zinc-900 dark:text-white">
                    {testSubjectCode} &bull; Programming in C
                  </b>
                </div>
                <div className="text-zinc-600 dark:text-zinc-400 mt-0.5">
                  Period {testPeriod} (10:00 AM - 10:50 AM) &bull; {testCategory} | {profile.section} | {profile.batch}
                </div>
                <div className="text-indigo-600 dark:text-indigo-400 text-[11px] font-bold mt-1.5">
                  Mark your attendance within five minutes.
                </div>
              </div>

              {/* Action Buttons Representation */}
              <div className="flex items-center gap-2 pt-1 border-t border-indigo-100 dark:border-indigo-900/40">
                <div className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] shadow-xs flex items-center gap-1">
                  <Check className="w-3 h-3" /> [PRESENT]
                </div>
                <div className="px-3 py-1 rounded-lg bg-rose-600 text-white font-bold text-[11px] shadow-xs flex items-center gap-1">
                  <X className="w-3 h-3" /> [ABSENT]
                </div>
                <span className="text-[10px] text-zinc-400 italic ml-auto">
                  Clickable inside your system notification drawer
                </span>
              </div>
            </div>

            {/* Test Trigger Button */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-zinc-600 dark:text-zinc-400">
                  Simulate Period:
                </span>
                <select
                  value={testPeriod}
                  onChange={(e) => setTestPeriod(Number(e.target.value))}
                  className="px-2 py-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-bold"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                    <option key={p} value={p}>
                      Period {p}
                    </option>
                  ))}
                </select>

                <select
                  value={testCategory}
                  onChange={(e) => setTestCategory(e.target.value)}
                  className="px-2 py-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
                >
                  <option value="Theory">Theory Lecture</option>
                  <option value="Lab">Lab (4 Units)</option>
                  <option value="Tutorial">Tutorial</option>
                </select>
              </div>

              <button
                onClick={handleSendTestPush}
                disabled={isLoading || !isSubscribed}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 shadow-md shadow-purple-600/20 transition-all flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" /> Send Test Actionable Push
              </button>
            </div>

            {/* Test Feedback Message */}
            {testResult && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-semibold flex items-start gap-2 animate-in fade-in ${
                  testResult.success
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                    : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                )}
                <div className="flex-1">
                  <div>{testResult.message || testResult.error}</div>
                  {countdownSeconds !== null && countdownSeconds > 0 && (
                    <div className="mt-1 font-mono text-[11px] text-emerald-700 dark:text-emerald-300 font-bold">
                      Active 5-Minute Window Remaining: {formatCountdown(countdownSeconds)} (Backend will accept Present/Absent action)
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Today's Scheduled Notifications Queue */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  Today&apos;s Class Notification Schedule ({dayName})
                </h3>
                <p className="text-xs text-zinc-500">
                  Calculated from your verified timetable version. Push alerts fire at class start.
                </p>
              </div>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {todaySlots.length} Classes Today
              </span>
            </div>

            {todaySlots.length === 0 ? (
              <div className="py-8 text-center text-zinc-400 text-xs">
                No classes scheduled for today. Web push notifications will resume on the next working day.
              </div>
            ) : (
              <div className="space-y-2">
                {todaySlots.map((slot) => (
                  <div
                    key={`${slot.period}-${slot.subjectCode}`}
                    className="p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0">
                        P{slot.period}
                      </span>
                      <div>
                        <div className="font-bold text-zinc-900 dark:text-white">
                          {slot.subjectName} ({slot.subjectCode})
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono">
                          {slot.category} &bull; Room {slot.room} &bull; Batch {slot.batch}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        Scheduled Alert
                      </span>
                      <div className="text-[10px] text-zinc-400 mt-0.5">
                        5-Min Window Enforced
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Protocol Specifications & Cross-Browser Guide */}
        <div className="space-y-6">
          {/* Five-Minute Window Architecture Explainer */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-500" /> Five-Minute Window Rule
            </h3>

            <div className="space-y-3 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 space-y-1">
                <div className="font-bold text-zinc-900 dark:text-white">
                  1. Minute 0:00 (Class Start)
                </div>
                <p className="text-[11px]">
                  Web Push arrives on your device with <b>[PRESENT]</b> and <b>[ABSENT]</b> action buttons.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-1 text-emerald-950 dark:text-emerald-200">
                <div className="font-bold">2. Minute 0:00 to 5:00</div>
                <p className="text-[11px]">
                  You can click either action directly from your notification panel without launching the browser tab.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 space-y-1 text-rose-950 dark:text-rose-200">
                <div className="font-bold">3. Minute 5:01 (Cutoff)</div>
                <p className="text-[11px]">
                  The backend enforces the cutoff deadline. If no attendance was recorded, the period is automatically marked <b>Absent</b>. Late notifications cannot be marked Present.
                </p>
              </div>
            </div>
          </div>

          {/* Cross-Browser Support Matrix */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-indigo-500" /> Platform Compatibility
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/40">
                <span className="font-medium flex items-center gap-1.5">
                  <Laptop className="w-3.5 h-3.5 text-zinc-500" /> Chrome & Edge Desktop
                </span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                  Full Actions ✅
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/40">
                <span className="font-medium flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-zinc-500" /> Chrome on Android
                </span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                  Full Actions ✅
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/40">
                <span className="font-medium flex items-center gap-1.5">
                  <Apple className="w-3.5 h-3.5 text-zinc-500" /> Safari iOS (Home Screen PWA)
                </span>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded">
                  Web Push ✅
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/40">
                <span className="font-medium flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-zinc-500" /> Firefox Desktop
                </span>
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950 px-1.5 py-0.5 rounded">
                  OS Dependent
                </span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed pt-1 border-t border-zinc-100 dark:border-zinc-800">
              * On iOS devices, open AttendX in Safari &rarr; tap the Share button &rarr; tap <b>Add to Home Screen</b> to enable system Web Push.
            </p>
          </div>
        </div>
      </div>
      {/* Floating Radial Navigation Wheel */}
      <RadialNavWheel variant="floating" />
    </div>
  );
}
