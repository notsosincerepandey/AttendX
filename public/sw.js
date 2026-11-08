// AttendX Service Worker: Web Push Notifications with Actionable Attendance

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// 1. Receive Push Message from Server
self.addEventListener('push', (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload = { title: 'ATTENDX – CLASS STARTED', body: event.data.text() };
    }
  }

  const title = payload.title || 'ATTENDX – CLASS STARTED';
  const options = {
    body: payload.body || 'Mark your attendance within five minutes.',
    icon: payload.icon || '/next.svg',
    badge: payload.badge || '/next.svg',
    tag: payload.tag || `attendx-class-${payload.data?.period || Date.now()}`,
    renotify: true,
    requireInteraction: true,
    data: payload.data || payload,
    actions: [
      {
        action: 'present',
        title: '✅ PRESENT',
      },
      {
        action: 'absent',
        title: '❌ ABSENT',
      },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 2. Actionable Attendance Buttons Click Handler (Works WITHOUT opening website)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action; // 'present' | 'absent' | ''
  const notifData = event.notification.data || {};

  if (action === 'present' || action === 'absent') {
    const targetStatus = action === 'present' ? 'PRESENT' : 'ABSENT';

    event.waitUntil(
      fetch('/api/attendance/quick-mark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: notifData.studentId,
          date: notifData.date,
          period: notifData.period,
          subjectCode: notifData.subjectCode,
          subjectName: notifData.subjectName,
          category: notifData.category,
          batch: notifData.batch,
          room: notifData.room,
          faculty: notifData.faculty,
          status: targetStatus,
          startTime: notifData.startTime,
          deadlineTime: notifData.deadlineTime,
          actionToken: notifData.actionToken,
          source: 'SERVICE_WORKER_ACTION',
        }),
      })
        .then(async (response) => {
          const result = await response.json();
          if (response.ok && result.success) {
            return self.registration.showNotification('AttendX Attendance Recorded', {
              body: `You marked ${notifData.subjectCode || 'Class'} (Period ${notifData.period || ''}) as ${targetStatus} ✅`,
              icon: '/next.svg',
              tag: `feedback-${notifData.period || Date.now()}`,
            });
          } else {
            return self.registration.showNotification('Attendance Window Closed', {
              body: result.error || 'The 5-minute attendance window has expired.',
              icon: '/next.svg',
              tag: `expired-${notifData.period || Date.now()}`,
            });
          }
        })
        .catch((err) => {
          console.error('Failed to submit attendance via SW background action:', err);
          return self.registration.showNotification('Attendance Submission Failed', {
            body: 'Unable to reach backend. Please verify your internet connection.',
            icon: '/next.svg',
          });
        })
    );
  } else {
    // Clicked notification body: Open or focus AttendX page
    const targetUrl = notifData.url || '/mark-attendance';
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes('/mark-attendance') && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
    );
  }
});
