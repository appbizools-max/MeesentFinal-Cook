const express = require('express');
const cors = require('cors');
const Razorpay = require('razorpay');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const admin = require('firebase-admin');

// ─── Firebase Admin Initialization ───────────────────────────────────────────
// Place your Firebase service account key at server/serviceAccountKey.json
// Download it from: Firebase Console > Project Settings > Service Accounts
if (!admin.apps.length) {
  try {
    const serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'meesent-543b7',
      storageBucket: 'meesent-543b7.firebasestorage.app',
    });
    console.log('[Firebase Admin] Initialized with service account key.');
  } catch (_) {
    // Fall back to Application Default Credentials when key file not present
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: 'meesent-543b7',
      storageBucket: 'meesent-543b7.firebasestorage.app',
    });
    console.log('[Firebase Admin] Initialized with Application Default Credentials.');
  }
}
const adminDb = admin.firestore();
const adminAuth = admin.auth();
const adminStorage = admin.storage();
// ─────────────────────────────────────────────────────────────────────────────

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for development
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(bodyParser.json());

// Razorpay configuration
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_live_TUhTjEytLCTbEZ',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'U3ZxI3u4YBT683GWf4xaN34L',
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Meesent backend server is running' });
});

// Create Razorpay order endpoint
app.post('/api/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      payment_capture: 1, // Auto-capture payment
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
      },
      key_id: process.env.RAZORPAY_KEY_ID || 'rzp_live_TUhTjEytLCTbEZ',
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Pricing Configuration GET API
app.get('/api/pricing', async (req, res) => {
  try {
    const docSnap = await adminDb.collection('config').doc('service_pricing').get();
    if (docSnap.exists) {
      res.json({ success: true, pricing: docSnap.data() });
    } else {
      const defaultPricing = {
        verification: 199,
        bigPlan: { monthly: 799, sixMonths: 4599, yearly: 9199 },
        smallPlan: { monthly: 499, sixMonths: 2899, yearly: 5699 }
      };
      await adminDb.collection('config').doc('service_pricing').set(defaultPricing);
      res.json({ success: true, pricing: defaultPricing });
    }
  } catch (error) {
    console.error('Get pricing API error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Pricing Configuration POST API (Bypasses Firestore client security rules)
app.post('/api/pricing', async (req, res) => {
  try {
    const pricing = req.body;
    await adminDb.collection('config').doc('service_pricing').set(pricing, { merge: true });
    console.log('[Pricing API] Pricing updated successfully:', pricing);
    res.json({ success: true, message: 'Pricing configuration saved successfully' });
  } catch (error) {
    console.error('Update pricing API error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Real-time Dashboard Stats API
app.get('/api/dashboard-stats', async (req, res) => {
  try {
    const [jobsSnap, servicesSnap, vendorsSnap, usersSnap, appsSnap] = await Promise.all([
      adminDb.collection('jobs').get(),
      adminDb.collection('services').get(),
      adminDb.collection('vendors').get(),
      adminDb.collection('users').get(),
      adminDb.collection('applications').get()
    ]);

    res.json({
      success: true,
      stats: {
        jobs: jobsSnap.size,
        services: servicesSnap.size,
        vendors: vendorsSnap.size,
        users: usersSnap.size,
        applications: appsSnap.size
      }
    });
  } catch (error) {
    console.error('Dashboard stats API error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create payment link endpoint (alternative approach)
app.post('/api/create-payment-link', async (req, res) => {
  try {
    const { amount, currency = 'INR', description = 'Payment for services' } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const paymentLink = await razorpay.paymentLink.create({
      amount: amount * 100,
      currency,
      accept_partial: false,
      description,
      reference_id: `ref_${Date.now()}`,
      customer: {
        name: 'Meesent User',
        contact: '9000000000',
        email: 'user@meesent.com',
      },
      notify: {
        sms: false,
        email: false,
      },
      reminder_enable: false,
      notes: {
        app: 'Meesent',
      },
    });

    res.json({
      success: true,
      payment_link: {
        id: paymentLink.id,
        url: paymentLink.short_url,
        amount: paymentLink.amount,
        currency: paymentLink.currency,
      },
    });
  } catch (error) {
    console.error('Error creating payment link:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Verify payment endpoint (for callback verification)
app.post('/api/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const crypto = require('crypto');
    const key_secret = process.env.RAZORPAY_KEY_SECRET || 'U3ZxI3u4YBT683GWf4xaN34L';

    const generated_signature = crypto
      .createHmac('sha256', key_secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generated_signature === razorpay_signature) {
      res.json({
        success: true,
        message: 'Payment verified successfully',
        payment_id: razorpay_payment_id,
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid signature',
      });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Start server
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(`Server accessible at http://192.168.0.118:${PORT}`);
  console.log(`Razorpay Live Mode enabled`);
});

// ─── 90-Day Account Deletion Cleanup ─────────────────────────────────────────
// Collections where user data is stored (field: userId)
const USER_COLLECTIONS = [
  'job_applications',
  'saved_jobs',
  'favorite_jobs',
  'resumes',
  'pincode_ads',
  'vendors',
  'payments',
  'notifications',
  'reviews',
  'leads',
];

/**
 * Delete all docs in a collection where userId == uid.
 * Handles Firestore's 500-document batch limit by chunking.
 */
async function deleteUserDocsFromCollection(collectionName, uid) {
  let deleted = 0;
  try {
    const snap = await adminDb
      .collection(collectionName)
      .where('userId', '==', uid)
      .get();

    if (snap.empty) return 0;

    // Chunk into batches of 450 (safe under the 500 limit)
    const docs = snap.docs;
    const chunkSize = 450;
    for (let i = 0; i < docs.length; i += chunkSize) {
      const chunk = docs.slice(i, i + chunkSize);
      const batch = adminDb.batch();
      chunk.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      deleted += chunk.length;
    }
  } catch (err) {
    console.error(`[Cleanup] Error in '${collectionName}' for ${uid}:`, err.message);
  }
  return deleted;
}

/**
 * Main cleanup:
 *  1. Finds users with accountDeleted=true AND scheduledPermanentDeleteAt <= now
 *  2. Deletes all their data across all collections
 *  3. Deletes their Firestore user document
 *  4. Deletes their Firebase Auth account (best-effort)
 */
async function runAccountDeletionCleanup() {
  console.log('[Cleanup] Running 90-day account deletion cleanup...');
  const now = new Date();
  try {
    const snap = await adminDb
      .collection('users')
      .where('accountDeleted', '==', true)
      .where('scheduledPermanentDeleteAt', '<=', now)
      .get();

    if (snap.empty) {
      console.log('[Cleanup] No accounts due for permanent deletion.');
      return;
    }

    console.log(`[Cleanup] Found ${snap.size} account(s) to permanently delete.`);

    for (const userDoc of snap.docs) {
      const uid = userDoc.id;
      console.log(`[Cleanup] Deleting account: ${uid}`);
      let totalDeleted = 0;

      // Delete from all user-data collections
      for (const col of USER_COLLECTIONS) {
        const count = await deleteUserDocsFromCollection(col, uid);
        if (count > 0) console.log(`[Cleanup]   ${count} docs deleted from '${col}'`);
        totalDeleted += count;
      }

      // Delete from deleted_accounts collection (using originalUid)
      try {
        const deletedAccountsSnap = await adminDb
          .collection('deleted_accounts')
          .where('originalUid', '==', uid)
          .get();
        if (!deletedAccountsSnap.empty) {
          const batch = adminDb.batch();
          deletedAccountsSnap.docs.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
          console.log(`[Cleanup]   ${deletedAccountsSnap.size} docs deleted from 'deleted_accounts'`);
        }
      } catch (err) {
        console.error(`[Cleanup] Error deleting from deleted_accounts for ${uid}:`, err.message);
      }

      // Also delete jobs posted by this user (field: postedBy) — chunked
      try {
        const postedSnap = await adminDb
          .collection('jobs')
          .where('postedBy', '==', uid)
          .get();
        if (!postedSnap.empty) {
          const docs = postedSnap.docs;
          const chunkSize = 450;
          let jobsDeleted = 0;
          for (let i = 0; i < docs.length; i += chunkSize) {
            const chunk = docs.slice(i, i + chunkSize);
            const batch = adminDb.batch();
            chunk.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            jobsDeleted += chunk.length;
          }
          console.log(`[Cleanup]   ${jobsDeleted} posted jobs deleted from 'jobs'`);
          totalDeleted += jobsDeleted;
        }
      } catch (err) {
        console.error(`[Cleanup] Error deleting posted jobs for ${uid}:`, err.message);
      }

      // Delete Firebase Storage files (profile image, uploads)
      try {
        const bucket = adminStorage.bucket();
        // Profile image stored at profiles/{uid}
        const [profileFiles] = await bucket.getFiles({ prefix: `profiles/${uid}` });
        for (const file of profileFiles) {
          await file.delete();
        }
        if (profileFiles.length > 0) {
          console.log(`[Cleanup]   ${profileFiles.length} Storage file(s) deleted for ${uid}`);
        }
      } catch (err) {
        // Storage cleanup failure is non-fatal
        console.warn(`[Cleanup] Storage cleanup warning for ${uid}:`, err.message);
      }

      // Delete the user document itself
      try {
        await adminDb.collection('users').doc(uid).delete();
        console.log(`[Cleanup]   User document deleted from 'users'`);
        totalDeleted++;
      } catch (err) {
        console.error(`[Cleanup] Error deleting user doc for ${uid}:`, err.message);
      }

      // Delete from Firebase Auth (may already be deleted by the app)
      try {
        await adminAuth.deleteUser(uid);
        console.log(`[Cleanup]   Firebase Auth account deleted`);
      } catch (err) {
        if (err.code !== 'auth/user-not-found') {
          console.error(`[Cleanup] Auth deletion error for ${uid}:`, err.message);
        }
      }

      console.log(`[Cleanup] Account ${uid} permanently deleted. Total docs removed: ${totalDeleted}`);
    }
  } catch (err) {
    console.error('[Cleanup] Fatal error during cleanup run:', err);
  }
}

// Middleware to verify Firebase ID Token and check if the user is an admin
async function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  const idToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : null;
  if (!idToken) {
    return res.status(401).json({ error: 'Missing token' });
  }
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    if (decodedToken.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    req.adminUid = decodedToken.uid;
    next();
  } catch (error) {
    console.error('[Auth Middleware] Token verification failed:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Middleware to verify Firebase ID Token for any authenticated user
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const idToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : null;
  if (!idToken) {
    return res.status(401).json({ error: 'Missing token' });
  }
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    req.decodedToken = decodedToken;
    next();
  } catch (error) {
    console.error('[Auth Middleware] Token verification failed:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}


// ── Set admin custom claim ────────────────────────────────────────────────────
// Call once per admin UID: POST /api/admin/set-admin-claim
// Headers: x-admin-secret: <ADMIN_CLEANUP_SECRET>
// Body: { "uid": "<firebase_uid>" }
app.post('/api/admin/set-admin-claim', async (req, res) => {
  const secret = req.headers['x-admin-secret'];
  const cleanupSecret = process.env.ADMIN_CLEANUP_SECRET || 'meesent-admin-cleanup-2026-rotated';
  if (secret !== cleanupSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { uid } = req.body;
  if (!uid) {
    return res.status(400).json({ error: 'Missing uid' });
  }
  try {
    await adminAuth.setCustomUserClaims(uid, { role: 'admin' });
    console.log(`[Admin Claim] Set role:admin on uid ${uid}`);
    res.json({ success: true, message: `role:admin granted to ${uid}. User must sign out and back in (or refresh token) for the claim to take effect.` });
  } catch (error) {
    console.error('[Admin Claim] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Manual trigger endpoint (for testing / admin panel) ─────────────────────
app.post('/api/admin/run-cleanup', async (req, res) => {
  const secret = req.headers['x-admin-secret'];
  const cleanupSecret = process.env.ADMIN_CLEANUP_SECRET || 'meesent-admin-cleanup-2026-rotated';
  if (secret !== cleanupSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    await runAccountDeletionCleanup();
    res.json({ success: true, message: 'Cleanup executed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── FCM Broadcast Endpoint (Web Admin dispatch) ──────────────────────────────
app.post('/api/admin/send-job-notification', requireAdmin, async (req, res) => {
  try {
    const { jobId, title, category, subCategory, company } = req.body;
    if (!jobId || !title) {
      return res.status(400).json({ error: 'Missing jobId or title' });
    }

    // Fetch all users with fcmToken
    const usersSnap = await adminDb.collection('users').get();
    const tokens = [];
    usersSnap.forEach(docSnap => {
      const data = docSnap.data();
      if (data.fcmToken) {
        tokens.push(data.fcmToken);
      }
    });

    if (tokens.length === 0) {
      console.log('[FCM] No registered FCM tokens found in database.');
      return res.json({ success: true, message: 'No registered FCM tokens found.' });
    }

    // Determine notification title and body based on category and subCategory mapping
    let notificationTitle = 'New Job Opportunity! 💼';
    let notificationBody = `${title} has been listed. Tap to check details!`;

    const subLower = (subCategory || '').toLowerCase().trim();
    const catLower = (category || '').toLowerCase().trim();
    const displayCompany = company || 'A top company';

    if (catLower === 'state govt' || catLower === 'central govt') {
      if (subLower === 'job') {
        if (catLower === 'state govt') {
          notificationTitle = 'New State Govt Job Alert! 🏛️';
        } else {
          notificationTitle = 'New Central Govt Job Alert! 🇮🇳';
        }
        notificationBody = `${title} has been announced. Tap to view details.`;
      } else if (subLower === 'result') {
        notificationTitle = 'Government Result Released! 📢';
        notificationBody = `${title} result is now available. Tap to check.`;
      } else if (subLower === 'admit card') {
        notificationTitle = 'Admit Card Released! 🎫';
        notificationBody = `${title} admit card is now available. Tap to download.`;
      } else if (subLower === 'exam date') {
        notificationTitle = 'Exam Date Announced! 📅';
        notificationBody = `The exam date for ${title} has been announced. Tap to view.`;
      } else if (subLower === 'answer key') {
        notificationTitle = 'Answer Key Released! 📝';
        notificationBody = `${title} answer key is now available. Tap to check.`;
      } else {
        // General fallback/Application
        notificationTitle = 'Applications Open! 🚀';
        notificationBody = `Applications for ${title} are now open. Tap to apply.`;
      }
    } else if (catLower === 'private jobs') {
      if (subLower === 'new job' || subLower === 'job') {
        notificationTitle = 'New Job Opportunity! 💼';
        notificationBody = `${title} at ${displayCompany} is now hiring. Tap to apply.`;
      } else if (subLower === 'job match') {
        notificationTitle = 'A Job That Matches You! 🎯';
        notificationBody = `${title} matches your profile. Tap to explore.`;
      } else if (subLower === 'nearby job') {
        notificationTitle = 'Jobs Near You! 📍';
        notificationBody = `New ${title} opportunities are available near you. Check now.`;
      } else if (subLower === 'urgent hiring') {
        notificationTitle = 'Urgent Hiring! 🚀';
        notificationBody = `${displayCompany} is hiring for ${title}. Apply now.`;
      } else if (subLower === 'work from home') {
        notificationTitle = 'New Work-From-Home Job! 🏠';
        notificationBody = `${title} is available for remote work. Tap to apply.`;
      } else if (subLower === 'freshers') {
        notificationTitle = 'New Fresher Opportunity! 🌟';
        notificationBody = `${displayCompany} is hiring freshers for ${title}. Apply now.`;
      } else if (subLower === 'application') {
        notificationTitle = 'Your Application Update 📋';
        notificationBody = `Your application for ${title} has been updated. Tap to check.`;
      } else if (subLower === 'deadline') {
        notificationTitle = 'Job Application Closing Soon! ⏰';
        notificationBody = `Applications for ${title} close soon. Apply before the deadline.`;
      } else if (subLower === 'recommended') {
        notificationTitle = 'Recommended Job For You! ⭐';
        notificationBody = `We found a ${title} that may be a great match for you.`;
      } else {
        // Fallback default
        notificationTitle = 'New Job Opportunity! 💼';
        notificationBody = `${title} at ${displayCompany} is now hiring. Tap to apply.`;
      }
    } else {
      // General default
      notificationTitle = 'New Job Opportunity! 💼';
      notificationBody = `${title} has been listed. Tap to check details!`;
    }

    console.log(`[FCM] Broadcasting to ${tokens.length} devices. Title: "${notificationTitle}"`);

    const payload = {
      tokens: tokens,
      notification: {
        title: notificationTitle,
        body: notificationBody,
      },
      data: {
        jobId: jobId,
        category: category || '',
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
      android: {
        notification: {
          sound: 'default',
          priority: 'high',
        }
      }
    };

    // Send multicast via Firebase Admin SDK
    const response = await admin.messaging().sendEachForMulticast(payload);
    console.log(`[FCM] Sent messages: success=${response.successCount}, failure=${response.failureCount}`);

    res.json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  } catch (error) {
    console.error('FCM Broadcast Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Send Instant Lead Push Notification to Vendor ─────────────────────────────
app.post('/api/send-lead-notification', async (req, res) => {
  try {
    const { vendorOwnerId, title, message, type = 'profile_view' } = req.body;
    if (!vendorOwnerId) {
      return res.status(400).json({ error: 'Missing vendorOwnerId' });
    }

    const userDoc = await adminDb.collection('users').doc(vendorOwnerId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Vendor user not found' });
    }

    const token = userDoc.data()?.fcmToken;
    if (!token) {
      return res.json({ success: false, message: 'No registered FCM token found for vendor' });
    }

    const notifTitle = title || 'New Profile Visitor 👀';
    const notifBody = message || 'Someone viewed your business profile. Tap to check in My Leads!';

    const payload = {
      token: token,
      notification: {
        title: notifTitle,
        body: notifBody,
      },
      data: {
        type: type,
        screen: 'MyLeads',
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
      android: {
        notification: {
          sound: 'default',
          priority: 'high',
        }
      }
    };

    const response = await admin.messaging().send(payload);
    console.log(`[FCM Lead] Sent push to vendor ${vendorOwnerId}:`, response);
    res.json({ success: true, messageId: response });
  } catch (error) {
    console.error('FCM Lead Notification Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Send Support Notification to User ───────────────────────────────────────
app.post('/api/admin/send-support-notification', requireAdmin, async (req, res) => {
  try {
    const { userId, message } = req.body;
    if (!userId || !message) {
      return res.status(400).json({ error: 'Missing userId or message' });
    }

    // Fetch user fcmToken from users collection
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    const token = userData?.fcmToken;

    if (!token) {
      console.log(`[FCM Support] User ${userId} has no registered FCM token.`);
      return res.json({ success: false, message: 'No registered FCM token found for user.' });
    }

    console.log(`[FCM Support] Sending support push notification to ${userId}.`);

    const payload = {
      token: token,
      notification: {
        title: 'Meesent Support 💬',
        body: message,
      },
      data: {
        type: 'support_message',
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
      android: {
        notification: {
          sound: 'default',
          priority: 'high',
        }
      }
    };

    const response = await admin.messaging().send(payload);
    console.log('[FCM Support] Sent support message success:', response);

    res.json({
      success: true,
      messageId: response,
    });
  } catch (error) {
    console.error('FCM Support Message Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/delete-chat', requireAdmin, async (req, res) => {
  try {
    const { chatId } = req.body;
    if (!chatId) {
      return res.status(400).json({ error: 'Missing chatId' });
    }

    console.log(`[Delete Chat] Wiping chat subcollection and document: ${chatId}`);

    // Chunk delete subcollection messages
    const messagesRef = adminDb.collection('chats').doc(chatId).collection('messages');
    let deletedCount = 0;
    while (true) {
      const snapshot = await messagesRef.limit(500).get();
      if (snapshot.empty) break;
      const batch = adminDb.batch();
      snapshot.docs.forEach(docSnap => batch.delete(docSnap.ref));
      await batch.commit();
      deletedCount += snapshot.size;
    }

    // Delete parent doc
    await adminDb.collection('chats').doc(chatId).delete();

    console.log(`[Delete Chat] Complete. Deleted ${deletedCount} messages.`);
    res.json({ success: true, deletedCount });
  } catch (error) {
    console.error('Delete Chat Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/send-chat-notification', requireAuth, async (req, res) => {
  try {
    const { senderId, senderRole, text, userId, userName } = req.body;
    if (!senderId || !senderRole || !text) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Enforce senderId matches the caller — no impersonation
    if (senderId !== req.decodedToken.uid) {
      return res.status(403).json({ error: 'senderId mismatch' });
    }

    // Only an actual admin can claim senderRole "admin"
    if (senderRole === 'admin' && req.decodedToken.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized as admin' });
    }

    if (senderRole === 'user') {
      // Send to admin_support_chat topic
      const payload = {
        topic: 'admin_support_chat',
        notification: {
          title: 'New support message',
          body: `${userName || 'User'}: ${text}`
        },
        data: {
          type: 'admin_support_chat',
          userId: senderId,
          click_action: 'FLUTTER_NOTIFICATION_CLICK'
        },
        android: {
          notification: {
            sound: 'default',
            priority: 'high'
          }
        }
      };
      const response = await admin.messaging().send(payload);
      console.log('[FCM Chat] Broadcast support topic success:', response);
      return res.json({ success: true, response });
    } else {
      // Send directly to user token
      if (!userId) {
        return res.status(400).json({ error: 'Missing userId for admin reply' });
      }
      const userDoc = await adminDb.collection('users').doc(userId).get();
      const token = userDoc.exists ? userDoc.data().fcmToken : null;
      if (!token) {
        console.log(`[FCM Chat] User ${userId} has no registered fcmToken.`);
        return res.json({ success: false, error: 'No fcmToken registered' });
      }
      const payload = {
        token: token,
        notification: {
          title: 'Support replied',
          body: text
        },
        data: {
          type: 'support_message',
          click_action: 'FLUTTER_NOTIFICATION_CLICK'
        },
        android: {
          notification: {
            sound: 'default',
            priority: 'high'
          }
        }
      };
      const response = await admin.messaging().send(payload);
      console.log('[FCM Chat] Sent reply success:', response);
      return res.json({ success: true, response });
    }
  } catch (error) {
    console.error('Send Chat Notification Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/close-chat-notification', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const userDoc = await adminDb.collection('users').doc(userId).get();
    const token = userDoc.exists ? userDoc.data().fcmToken : null;
    if (!token) {
      console.log(`[FCM Chat] User ${userId} has no registered fcmToken for close notification.`);
      return res.json({ success: false, error: 'No fcmToken registered' });
    }

    const payload = {
      token: token,
      notification: {
        title: 'Conversation closed',
        body: 'Support has closed this conversation. Message again anytime.'
      },
      data: {
        type: 'support_message_closed',
        click_action: 'FLUTTER_NOTIFICATION_CLICK'
      },
      android: {
        notification: {
          sound: 'default',
          priority: 'high'
        }
      }
    };
    const response = await admin.messaging().send(payload);
    console.log('[FCM Chat] Sent close notification success:', response);
    res.json({ success: true, response });
  } catch (error) {
    console.error('Close Chat Notification Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Expose test endpoint for expiry notifications ───────────────────────────
app.post('/api/admin/test-expiry-notification', async (req, res) => {
  try {
    const { vendorId, days = 5 } = req.body;
    if (!vendorId) {
      return res.status(400).json({ error: 'Missing vendorId' });
    }

    // Fetch vendor
    const vendorDoc = await adminDb.collection('vendors').doc(vendorId).get();
    if (!vendorDoc.exists) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const vendorData = vendorDoc.data();
    const userId = vendorData.userId;
    if (!userId) {
      return res.status(400).json({ error: 'Vendor has no associated userId' });
    }

    // Fetch user fcmToken
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const fcmToken = userDoc.data().fcmToken;
    if (!fcmToken) {
      return res.status(400).json({ error: 'User has no registered FCM token' });
    }

    const title = 'Plan Expiring Soon ⏰';
    const body = `Your plan for "${vendorData.businessName || 'your business'}" is ending soon. ${days} days remaining.`;

    // 1. Send push notification via FCM
    const payload = {
      token: fcmToken,
      notification: {
        title: title,
        body: body,
      },
      data: {
        type: 'plan_expiring',
        vendorId: vendorId,
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
      android: {
        notification: {
          sound: 'default',
          priority: 'high',
        }
      }
    };

    const response = await admin.messaging().send(payload);

    // 2. Add notification record to Firestore
    await adminDb.collection('notifications').add({
      userId: userId,
      type: 'plan_expiring',
      title: title,
      body: body,
      vendorId: vendorId,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({
      success: true,
      message: 'Test notification sent successfully',
      messageId: response
    });
  } catch (error) {
    console.error('Test Notification Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Vendor Plan Expiration Checker ──────────────────────────────────────────
async function checkAndSendPlanExpiryNotifications() {
  console.log('[Cron] Checking vendor plan expirations...');
  try {
    const vendorsSnap = await adminDb.collection('vendors').get();
    if (vendorsSnap.empty) {
      console.log('[Cron] No vendors found.');
      return;
    }

    const now = new Date();
    let sentCount = 0;

    for (const vendorDoc of vendorsSnap.docs) {
      const vendorId = vendorDoc.id;
      const vendorData = vendorDoc.data();
      
      // Skip if no plan expiry
      if (!vendorData.planExpiry) continue;

      // Parse plan expiry date
      const expiryDate = new Date(vendorData.planExpiry);
      const diffTime = expiryDate - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // We notify if remaining days is between 1 and 5
      if (diffDays >= 1 && diffDays <= 5) {
        // Check 6-hour rate limiting to avoid duplicate notifications on same day runs
        let shouldSkip = false;
        if (vendorData.lastExpiryNotifSentAt) {
          const lastSent = vendorData.lastExpiryNotifSentAt.toDate 
            ? vendorData.lastExpiryNotifSentAt.toDate() 
            : new Date(vendorData.lastExpiryNotifSentAt);
          if (now - lastSent < 6 * 60 * 60 * 1000) {
            shouldSkip = true;
          }
        }

        if (shouldSkip) {
          console.log(`[Cron] Skip vendor ${vendorId} - notification sent recently.`);
          continue;
        }

        const userId = vendorData.userId;
        if (!userId) continue;

        // Fetch user to get fcmToken
        const userDoc = await adminDb.collection('users').doc(userId).get();
        if (!userDoc.exists) continue;

        const fcmToken = userDoc.data().fcmToken;
        if (fcmToken) {
          const title = 'Plan Expiring Soon ⏰';
          const body = `Your plan for "${vendorData.businessName || 'your business'}" is ending soon. ${diffDays} day${diffDays !== 1 ? 's' : ''} remaining.`;

          // Send FCM
          const payload = {
            token: fcmToken,
            notification: {
              title: title,
              body: body,
            },
            data: {
              type: 'plan_expiring',
              vendorId: vendorId,
              click_action: 'FLUTTER_NOTIFICATION_CLICK',
            },
            android: {
              notification: {
                sound: 'default',
                priority: 'high',
              }
            }
          };

          try {
            await admin.messaging().send(payload);
            
            // Add notification record to Firestore
            await adminDb.collection('notifications').add({
              userId: userId,
              type: 'plan_expiring',
              title: title,
              body: body,
              vendorId: vendorId,
              read: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Update vendor document
            await adminDb.collection('vendors').doc(vendorId).update({
              lastExpiryNotifSentAt: admin.firestore.FieldValue.serverTimestamp()
            });

            sentCount++;
            console.log(`[Cron] Sent expiry notification for vendor: ${vendorId} (${diffDays} days left)`);
          } catch (fcmErr) {
            console.error(`[Cron] FCM error for vendor ${vendorId}:`, fcmErr.message);
          }
        }
      }
    }
    console.log(`[Cron] Plan expiry check finished. Sent ${sentCount} notifications.`);
  } catch (error) {
    console.error('[Cron] Error checking plan expirations:', error);
  }
}

// ── Schedule: every day at 2:00 AM IST ──────────────────────────────────────
cron.schedule('0 2 * * *', () => {
  runAccountDeletionCleanup();
}, { scheduled: true, timezone: 'Asia/Kolkata' });
console.log('[Cron] Account deletion cleanup scheduled — runs daily at 2:00 AM IST.');

// ── Schedule: twice daily at 10:00 AM and 6:00 PM IST ────────────────────────
cron.schedule('0 10,18 * * *', () => {
  checkAndSendPlanExpiryNotifications();
}, { scheduled: true, timezone: 'Asia/Kolkata' });
console.log('[Cron] Vendor plan expiration check scheduled — runs twice daily at 10:00 AM and 6:00 PM IST.');
// ─────────────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[Meesent Server] Running on http://localhost:${PORT}`);
});
