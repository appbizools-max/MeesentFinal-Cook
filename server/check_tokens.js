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

const db = admin.firestore();

async function checkTokens() {
  console.log("Checking users collection for push tokens...");
  const snap = await db.collection('users').get();
  console.log(`Total users in Firestore: ${snap.size}`);
  
  let withTokens = 0;
  snap.forEach(doc => {
    const data = doc.data();
    if (data.pushToken) {
      console.log(`User: ${doc.id} | Name: ${data.name || data.displayName || 'N/A'} | Token: ${data.pushToken}`);
      withTokens++;
    }
  });
  
  console.log(`Total users with push tokens: ${withTokens}`);
  process.exit(0);
}

checkTokens().catch(err => {
  console.error("Diagnostic failed:", err);
  process.exit(1);
});
