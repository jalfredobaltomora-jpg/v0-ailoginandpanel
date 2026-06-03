// Service Worker para Firebase Cloud Messaging
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDoyKZUXIQzdvNrWcUcAGXWlvRXdFbt5cQ",
  authDomain: "system-control-administrative.firebaseapp.com",
  databaseURL: "https://system-control-administrative-default-rtdb.firebaseio.com",
  projectId: "system-control-administrative",
  storageBucket: "system-control-administrative.firebasestorage.app",
  messagingSenderId: "845151026845",
  appId: "1:845151026845:web:43dc0d68130ce5476d5e74",
});

const messaging = firebase.messaging();

// Push en segundo plano
messaging.onBackgroundMessage((payload) => {
  const { title, body, tag, requireInteraction } = payload.data || {};
  if (!title) return;

  self.registration.showNotification(title, {
    body: body || '',
    icon: '/icon.png',
    tag: tag || 'sca-alarm',
    requireInteraction: requireInteraction !== 'false',
    vibrate: [200, 100, 200, 100, 400],
    sound: 'default',
  });
});

// Clic en notificacion
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      if (list.length > 0) return list[0].focus();
      return clients.openWindow('/');
    })
  );
});
