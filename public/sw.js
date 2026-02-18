self.addEventListener('push', (event) => {
  let payload = {
    title: 'Workout Tracker',
    body: 'Your timer has finished.',
    tag: 'workout-rest-timer',
    data: {},
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = {
        ...payload,
        ...parsed,
      };
    } catch {
      // Ignore invalid payload and use defaults.
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      data: payload.data,
      requireInteraction: false,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetPath = '/workout';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) {
            client.navigate(targetPath);
          }
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetPath);
      }
      return undefined;
    })
  );
});
