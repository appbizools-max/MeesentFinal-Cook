const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'meesent-543b7'
  });
}
const db = admin.firestore();

async function run() {
  const vendorId = process.argv[2];
  if (!vendorId) {
    console.error("Please provide a vendorId. Example: node send_test_expiry.js <vendorId>");
    process.exit(1);
  }

  const days = process.argv[3] ? parseInt(process.argv[3]) : 5;

  console.log(`Fetching vendor: ${vendorId}...`);
  const vendorDoc = await db.collection('vendors').doc(vendorId).get();
  if (!vendorDoc.exists) {
    console.error("Vendor not found!");
    process.exit(1);
  }

  const vendorData = vendorDoc.data();
  const userId = vendorData.userId;
  if (!userId) {
    console.error("Vendor has no associated userId!");
    process.exit(1);
  }

  console.log(`Fetching user profile: ${userId}...`);
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    console.error("User profile not found!");
    process.exit(1);
  }

  const fcmToken = userDoc.data().fcmToken;
  if (!fcmToken) {
    console.error("User has no registered FCM token!");
    process.exit(1);
  }

  const title = 'Plan Expiring Soon ⏰';
  const body = `Your plan for "${vendorData.businessName || 'your business'}" is ending soon. ${days} days remaining.`;

  console.log(`Sending FCM notification to token...`);
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
  console.log(`FCM Message sent successfully! Message ID: ${response}`);

  console.log(`Adding notification record to Firestore...`);
  await db.collection('notifications').add({
    userId: userId,
    type: 'plan_expiring',
    title: title,
    body: body,
    vendorId: vendorId,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  console.log("Notification record saved. Success!");
}

run().catch(console.error);
