/* eslint-disable */
/**
 * Firebase Cloud Messaging background handler for AgroTraders web push.
 *
 * The public Firebase config is passed on the registration URL's query string
 * (see src/lib/webPush.ts) so we don't need a Vite build step to template this
 * file — the values are identifiers, not secrets. Compat SDKs are used because
 * service workers can't import the modular ESM build.
 */
importScripts('https://www.gstatic.com/firebasejs/11.1.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.1.0/firebase-messaging-compat.js');

const params = new URLSearchParams(self.location.search);
const cfg = {
  apiKey: params.get('apiKey'),
  authDomain: params.get('authDomain'),
  projectId: params.get('projectId'),
  storageBucket: params.get('storageBucket'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
};

if (cfg.apiKey && cfg.projectId) {
  firebase.initializeApp(cfg);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const n = payload.notification || {};
    self.registration.showNotification(n.title || 'AgroTraders', {
      body: n.body || '',
      icon: '/favicon-32.png',
      badge: '/favicon-32.png',
      data: payload.data || {},
    });
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.linkUrl) || '/console';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client) client.navigate(link).catch(() => {});
          return client.focus();
        }
      }
      return self.clients.openWindow(link);
    }),
  );
});
