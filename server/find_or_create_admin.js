const admin = require('firebase-admin');

try {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'meesent-543b7',
  });
} catch (_) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'meesent-543b7',
  });
}

const auth = admin.auth();
const db = admin.firestore();

async function run() {
  const email = 'admin@meesent.com';
  const password = 'admin123';
  let userRecord;

  try {
    userRecord = await auth.getUserByEmail(email);
    console.log(`Found existing user with email ${email}: ${userRecord.uid}`);
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      userRecord = await auth.createUser({
        email: email,
        password: password,
        emailVerified: true,
        displayName: 'Meesent Admin'
      });
      console.log(`Created new user with email ${email}: ${userRecord.uid}`);
    } else {
      throw error;
    }
  }

  // Set role: 'admin' custom claim
  await auth.setCustomUserClaims(userRecord.uid, { role: 'admin' });
  console.log(`Granted role: 'admin' claim to user ${userRecord.uid}`);

  // Create/update Firestore user document
  await db.collection('users').doc(userRecord.uid).set({
    email: email,
    name: 'Meesent Admin',
    role: 'admin',
    vendorStatus: 'approved',
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  console.log(`Updated Firestore document for user ${userRecord.uid}`);

  console.log(`Admin user is fully ready:`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  process.exit(0);
}

run().catch(err => {
  console.error("Execution failed:", err);
  process.exit(1);
});
