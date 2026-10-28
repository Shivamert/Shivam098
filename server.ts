import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import webpush from 'web-push';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV !== 'production';

app.use(express.json());

// Persistent or generated VAPID keys for Web Push
const VAPID_FILE = path.join(__dirname, '.vapid-keys.json');
let vapidKeys: { publicKey: string; privateKey: string };

try {
  if (fs.existsSync(VAPID_FILE)) {
    vapidKeys = JSON.parse(fs.readFileSync(VAPID_FILE, 'utf-8'));
  } else {
    vapidKeys = webpush.generateVAPIDKeys();
    fs.writeFileSync(VAPID_FILE, JSON.stringify(vapidKeys, null, 2), 'utf-8');
  }
} catch (e) {
  vapidKeys = webpush.generateVAPIDKeys();
}

webpush.setVapidDetails(
  'mailto:support@routineflow.app',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// In-memory / file-backed push subscriptions and notification log
interface StoredSubscription {
  id: string;
  userId: string;
  subscription: webpush.PushSubscription;
  createdAt: number;
}

interface DeliveryRecord {
  id: string;
  occurrenceId: string;
  reminderId: string;
  sentAt: number;
  status: 'sent' | 'failed';
  error?: string;
}

const subscriptionsFile = path.join(__dirname, '.subscriptions.json');
let subscriptions: StoredSubscription[] = [];

try {
  if (fs.existsSync(subscriptionsFile)) {
    subscriptions = JSON.parse(fs.readFileSync(subscriptionsFile, 'utf-8'));
  }
} catch (e) {
  subscriptions = [];
}

function saveSubscriptions() {
  try {
    fs.writeFileSync(subscriptionsFile, JSON.stringify(subscriptions, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to persist subscriptions', e);
  }
}

const deliveryLog: DeliveryRecord[] = [];

// ================= API ROUTES =================

// 1. Get VAPID public key
app.get('/api/push/vapid-public-key', (_req, res) => {
  res.json({
    publicKey: vapidKeys.publicKey,
  });
});

// 2. Register Web Push subscription
app.post('/api/push/subscribe', (req, res) => {
  const { subscription, userId } = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Valid subscription object is required' });
  }

  // Deduplicate by endpoint
  const existingIndex = subscriptions.findIndex(
    (s) => s.subscription.endpoint === subscription.endpoint
  );

  const subEntry: StoredSubscription = {
    id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    userId: userId || 'anonymous',
    subscription,
    createdAt: Date.now(),
  };

  if (existingIndex >= 0) {
    subscriptions[existingIndex] = subEntry;
  } else {
    subscriptions.push(subEntry);
  }

  saveSubscriptions();
  res.json({ success: true, count: subscriptions.length });
});

// 3. Unsubscribe Web Push
app.post('/api/push/unsubscribe', (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) {
    return res.status(400).json({ error: 'Endpoint is required' });
  }

  subscriptions = subscriptions.filter((s) => s.subscription.endpoint !== endpoint);
  saveSubscriptions();
  res.json({ success: true, remaining: subscriptions.length });
});

// 4. Send test push notification
app.post('/api/push/test', async (req, res) => {
  const { endpoint } = req.body;
  const targetSubs = endpoint
    ? subscriptions.filter((s) => s.subscription.endpoint === endpoint)
    : subscriptions;

  if (targetSubs.length === 0) {
    return res.status(404).json({
      error: 'No active push subscriptions found on server. Please enable notifications first.',
    });
  }

  const payload = JSON.stringify({
    title: 'RoutineFlow Alert',
    body: 'Your push notification system is active and ready for scheduled routine reminders!',
    tag: 'rf-test-' + Date.now(),
    data: { url: '/?test=1', timestamp: Date.now() },
  });

  const results = await Promise.allSettled(
    targetSubs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub.subscription, payload);
        return { id: sub.id, status: 'ok' };
      } catch (err: any) {
        // If subscription is 410 Gone or 404, clean it up
        if (err.statusCode === 410 || err.statusCode === 404) {
          subscriptions = subscriptions.filter((s) => s.id !== sub.id);
          saveSubscriptions();
        }
        throw err;
      }
    })
  );

  const successful = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  res.json({
    success: successful > 0,
    sent: successful,
    failed,
    total: targetSubs.length,
  });
});

// 5. Process scheduled reminders (Idempotent processing)
app.post('/api/push/process-reminders', async (req, res) => {
  const { reminders } = req.body; // Array of { occurrenceId, reminderId, taskTitle, scheduledTime, minutesBefore }
  if (!Array.isArray(reminders)) {
    return res.status(400).json({ error: 'Reminders array required' });
  }

  const processed: string[] = [];

  for (const item of reminders) {
    const dedupeKey = `${item.occurrenceId}_${item.reminderId}`;
    const alreadySent = deliveryLog.some(
      (log) => log.occurrenceId === item.occurrenceId && log.reminderId === item.reminderId
    );

    if (alreadySent) {
      continue;
    }

    const payload = JSON.stringify({
      title: `RoutineFlow: ${item.taskTitle}`,
      body: item.minutesBefore > 0
        ? `Starts in ${item.minutesBefore} minutes (${item.scheduledTime || 'Scheduled'})`
        : `Scheduled now at ${item.scheduledTime || 'Today'}!`,
      tag: `rf-${item.occurrenceId}`,
      data: {
        occurrenceId: item.occurrenceId,
        url: `/?task=${item.taskId || ''}`,
      },
    });

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(sub.subscription, payload);
        deliveryLog.push({
          id: `del_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          occurrenceId: item.occurrenceId,
          reminderId: item.reminderId,
          sentAt: Date.now(),
          status: 'sent',
        });
        processed.push(dedupeKey);
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          subscriptions = subscriptions.filter((s) => s.id !== sub.id);
          saveSubscriptions();
        }
      }
    }
  }

  res.json({
    success: true,
    processedCount: processed.length,
    processed,
  });
});

// 6. Push status check
app.get('/api/push/status', (_req, res) => {
  res.json({
    activeSubscriptions: subscriptions.length,
    vapidConfigured: !!vapidKeys.publicKey,
    deliveryLogCount: deliveryLog.length,
  });
});

// Vite middleware in dev or static files in production
async function startServer() {
  if (isDev) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`[RoutineFlow Server] Running on http://localhost:${PORT} (${isDev ? 'development' : 'production'})`);
  });
}

startServer();
