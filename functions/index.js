const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.database();

/**
 * Se ejecuta cada minuto.
 * Revisa la rama /alarms/{userCode}/{date}/{type}
 * Si encuentra alarmas con scheduledAt <= ahora y notified == false,
 * envia push notification via FCM y marca como notified.
 */
exports.checkAlarms = functions.pubsub.schedule('* * * * *').onRun(async () => {
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);

  const alarmsSnap = await db.ref('alarms').once('value');
  const allAlarms = alarmsSnap.val();

  if (!allAlarms) {
    console.log('No hay alarmas programadas');
    return null;
  }

  const notifications = [];

  for (const [userCode, dates] of Object.entries(allAlarms)) {
    // Solo revisar hoy
    const dayAlarms = dates[today];
    if (!dayAlarms) continue;

    for (const [type, alarm] of Object.entries(dayAlarms)) {
      if (alarm.notified) continue;
      if (alarm.scheduledAt > now) continue;

      // Obtener el FCM token del usuario
      const tokenSnap = await db.ref(`fcm-tokens/${userCode}`).once('value');
      const tokenData = tokenSnap.val();

      if (!tokenData || !tokenData.token) {
        console.log(`Usuario ${userCode} no tiene token FCM`);
        continue;
      }

      const title = type === 'lunch' ? '¡Hora del Almuerzo!' : '¡Hora de Salida!';
      let body = type === 'lunch'
        ? 'Tienes 10 minutos para ir a almorzar.'
        : 'Te quedan 10 minutos para salir.';

      // Si es mujer embarazada, ajustar mensaje
      if (type === 'exit') {
        const empSnap = await db.ref(`empleados/${userCode}`).once('value');
        const emp = empSnap.val();
        if (emp && emp.sexo === 'femenino' && emp.embarazada) {
          body = 'Te quedan 10 min para salir. Embarazada: retírate 10 min antes.';
        }
      }

      notifications.push({
        token: tokenData.token,
        notification: { title, body },
        data: {
          title,
          body,
          tag: `sca-${type}-${today}`,
          requireInteraction: 'true',
          type,
          userCode,
          date: today,
        },
      });

      // Marcar como notificada
      await db.ref(`alarms/${userCode}/${today}/${type}/notified`).set(true);
    }
  }

  if (notifications.length === 0) {
    console.log('No hay alarmas pendientes de notificar');
    return null;
  }

  // Enviar cada notificación individual a cada usuario
  const results = await admin.messaging().sendEach(
    notifications.map(n => ({
      token: n.token,
      notification: n.notification,
      data: n.data,
    }))
  );

  console.log(`Notificaciones enviadas: ${results.successCount}, fallos: ${results.failureCount}`);
  return null;
});
