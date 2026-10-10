import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

// Existing job creation FCM broadcast hook
export const onJobCreated = functions.firestore
  .document('jobs/{jobId}')
  .onCreate(async (snap) => {
    const jobData = snap.data();
    if (!jobData) {
      console.log('No job data found.');
      return;
    }

    const title = jobData.title || 'New Job Listing';
    const district = jobData.district;

    if (!district) {
      console.log('Job does not have a district specified.');
      return;
    }

    const topicName = `district_${district.replace(/\s+/g, '_').toLowerCase()}`;

    const message: admin.messaging.TopicMessage = {
      topic: topicName,
      notification: {
        title: `New Job in ${district}! 💼`,
        body: `${title} has been posted. Tap to view and apply.`,
      },
      data: {
        jobId: snap.id,
      },
      android: {
        notification: {
          sound: 'default',
          priority: 'high',
        },
      },
    };

    try {
      const response = await admin.messaging().send(message);
      console.log(`Successfully broadcasted new job notification to topic ${topicName}:`, response);
    } catch (error) {
      console.error(`Failed to send topic notification to ${topicName}:`, error);
    }
  });

// 1. Metric increment callable (Views / Calls)
export const incrementVendorMetrics = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
  }

  const uid = context.auth.uid;
  const { vendorId, metricType } = data; // metricType: 'views' | 'calls'

  if (!vendorId || !metricType || (metricType !== 'views' && metricType !== 'calls')) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid arguments.');
  }

  // Prevent self-incrementing
  if (uid === vendorId) {
    console.log(`Vendor ${vendorId} tried to increment their own metrics. Ignored.`);
    return { success: false, reason: 'self-incrementing' };
  }

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const monthKey = `${yyyy}-${mm}`;
  const docId = `${vendorId}_${monthKey}`;

  const metricsRef = admin.firestore().collection('vendorMonthlyMetrics').doc(docId);

  try {
    await admin.firestore().runTransaction(async (transaction) => {
      const snap = await transaction.get(metricsRef);
      if (!snap.exists) {
        transaction.set(metricsRef, {
          vendorId,
          month: monthKey,
          viewCount: metricType === 'views' ? 1 : 0,
          callCount: metricType === 'calls' ? 1 : 0,
          guaranteeMet: false,
          evaluatedAt: null
        });
      } else {
        const fieldToIncrement = metricType === 'views' ? 'viewCount' : 'callCount';
        const currentData = snap.data();
        const newViews = (currentData?.viewCount || 0) + (metricType === 'views' ? 1 : 0);
        const newCalls = (currentData?.callCount || 0) + (metricType === 'calls' ? 1 : 0);
        const guaranteeMet = newViews >= 5 || newCalls >= 1;

        transaction.update(metricsRef, {
          [fieldToIncrement]: admin.firestore.FieldValue.increment(1),
          guaranteeMet
        });
      }
    });

    // Also update views/leads values directly in vendor document for faster client lookups
    const vendorRef = admin.firestore().collection('vendors').doc(vendorId);
    const field = metricType === 'views' ? 'views' : 'leads';
    await vendorRef.set({
      [field]: admin.firestore.FieldValue.increment(1)
    }, { merge: true });

    return { success: true };
  } catch (error) {
    console.error('Error incrementing vendor metrics:', error);
    throw new functions.https.HttpsError('internal', 'Internal error occurred.');
  }
});

// 2. Scheduled daily subscription evaluation
export const dailySubscriptionEvaluation = functions.pubsub
  .schedule('0 0 * * *')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const db = admin.firestore();

    console.log(`Starting subscription evaluation daily check run at ${new Date().toISOString()}`);

    try {
      const querySnapshot = await db.collection('vendorSubscriptions')
        .where('status', 'in', ['active', 'extended'])
        .where('currentPeriodEnd', '<=', now)
        .get();

      console.log(`Found ${querySnapshot.size} subscriptions due for check.`);

      for (const subSnap of querySnapshot.docs) {
        const subData = subSnap.data();
        const vendorId = subData.vendorId || subSnap.id;
        const planId = subData.planId;
        const billingCycleMonths = subData.billingCycleMonths || 1;
        const currentPeriodStart = subData.currentPeriodStart;
        const currentPeriodEnd = subData.currentPeriodEnd;

        if (!planId || planId === 'free') {
          console.log(`Vendor ${vendorId} is on free/no plan. Skipping evaluation.`);
          continue;
        }

        const cycleStartDate = currentPeriodStart.toDate();
        const yyyy = cycleStartDate.getFullYear();
        const mm = String(cycleStartDate.getMonth() + 1).padStart(2, '0');
        const monthKey = `${yyyy}-${mm}`;
        const metricDocId = `${vendorId}_${monthKey}`;

        const metricSnap = await db.collection('vendorMonthlyMetrics').doc(metricDocId).get();
        let viewCount = 0;
        let callCount = 0;
        let whatsappCount = 0;

        if (metricSnap.exists) {
          const metricData = metricSnap.data();
          viewCount = metricData?.viewCount || 0;
          callCount = metricData?.callCount || 0;
          whatsappCount = metricData?.whatsappCount || 0;
        }

        // Also query direct leads for this vendor in this period
        try {
          const startIso = currentPeriodStart.toDate ? currentPeriodStart.toDate().toISOString() : new Date(currentPeriodStart).toISOString();
          const endIso = currentPeriodEnd.toDate ? currentPeriodEnd.toDate().toISOString() : new Date(currentPeriodEnd).toISOString();
          const leadsSnap = await db.collection('leads')
            .where('vendorId', '==', vendorId)
            .get();

          leadsSnap.forEach((lSnap) => {
            const lData = lSnap.data();
            const createdAt = lData?.createdAt;
            if (createdAt && createdAt >= startIso && createdAt <= endIso) {
              if (lData.hasCalled || lData.type === 'call') callCount++;
              else if (lData.hasWhatsApp || lData.type === 'whatsapp') whatsappCount++;
              else viewCount++;
            }
          });
        } catch (e) {
          console.warn(`Error reading leads for vendor ${vendorId}:`, e);
        }

        const guaranteeMet = viewCount >= 5 || callCount >= 1 || whatsappCount >= 1;

        const batch = db.batch();

        if (guaranteeMet) {
          console.log(`Vendor ${vendorId} MET guarantee (${viewCount} views, ${callCount} calls). Renewing subscription.`);
          
          const nextPeriodStart = currentPeriodEnd;
          const nextPeriodEnd = advanceMonths(currentPeriodEnd, billingCycleMonths);

          batch.update(subSnap.ref, {
            currentPeriodStart: nextPeriodStart,
            currentPeriodEnd: nextPeriodEnd,
            status: 'active',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          const planSnap = await db.collection('plans').doc(planId).get();
          let amount = 499;
          if (planSnap.exists) {
            const planData = planSnap.data();
            const billingOption = planData?.billingOptions?.find((opt: any) => opt.months === billingCycleMonths);
            amount = billingOption ? billingOption.price : (planData?.priceMonthly * billingCycleMonths || amount);
          }

          const txnRef = db.collection('transactions').doc();
          batch.set(txnRef, {
            vendorId,
            subscriptionId: subSnap.id,
            planId,
            amount,
            type: 'renewal',
            status: 'success',
            paymentMethod: 'Razorpay Auto-debit',
            gatewayTransactionId: 'PAY-' + Math.floor(10000000 + Math.random() * 90000000),
            date: now,
            periodStart: nextPeriodStart,
            periodEnd: nextPeriodEnd,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });

          const vendorRef = db.collection('vendors').doc(vendorId);
          batch.update(vendorRef, {
            planExpiry: nextPeriodEnd.toDate().toISOString(),
            plan: planId,
            planBundle: `${planId.toUpperCase()} (${billingCycleMonths}M)`
          });

          await batch.commit();

          await db.collection('subscriptionEvaluationLogs').add({
            vendorId,
            status: 'renewed',
            guaranteeMet: true,
            viewCount,
            callCount,
            timestamp: now
          });

          await sendPush(vendorId, 'Subscription Renewed! 🚀', `Your Meesent ${planId.toUpperCase()} plan has been successfully renewed. Thank you!`);
        } else {
          console.log(`Vendor ${vendorId} DID NOT MEET guarantee (${viewCount} views, ${callCount} calls). Giving free extension.`);

          const nextPeriodEnd = advanceMonths(currentPeriodEnd, 1);

          batch.update(subSnap.ref, {
            currentPeriodEnd: nextPeriodEnd,
            status: 'extended',
            extensionCount: admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          const txnRef = db.collection('transactions').doc();
          batch.set(txnRef, {
            vendorId,
            subscriptionId: subSnap.id,
            planId,
            amount: 0,
            type: 'free_extension',
            status: 'success',
            paymentMethod: null,
            gatewayTransactionId: null,
            date: now,
            periodStart: currentPeriodStart,
            periodEnd: nextPeriodEnd,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });

          const vendorRef = db.collection('vendors').doc(vendorId);
          batch.update(vendorRef, {
            planExpiry: nextPeriodEnd.toDate().toISOString(),
            planBundle: `${planId.toUpperCase()} (EXTENDED)`
          });

          await batch.commit();

          await db.collection('subscriptionEvaluationLogs').add({
            vendorId,
            status: 'extended',
            guaranteeMet: false,
            viewCount,
            callCount,
            timestamp: now
          });

          await sendPush(vendorId, 'Great News: 1 Month Free! 🎉', `You received a free 1-month plan extension because you didn't hit your guaranteed monthly leads. We've got you covered!`);
        }

        if (metricSnap.exists) {
          await metricSnap.ref.update({
            evaluatedAt: now
          });
        }
      }
    } catch (error) {
      console.error('Error during daily subscription evaluation run:', error);
    }
  });

const advanceMonths = (timestamp: admin.firestore.Timestamp, months: number): admin.firestore.Timestamp => {
  const date = timestamp.toDate();
  date.setMonth(date.getMonth() + months);
  return admin.firestore.Timestamp.fromDate(date);
};

const sendPush = async (userId: string, title: string, body: string) => {
  try {
    const userSnap = await admin.firestore().collection('users').doc(userId).get();
    if (!userSnap.exists) return;
    const userData = userSnap.data();
    const fcmToken = userData?.fcmToken;
    if (!fcmToken) return;

    const message: admin.messaging.Message = {
      token: fcmToken,
      notification: { title, body },
      android: {
        notification: {
          sound: 'default',
          priority: 'high',
        },
      },
    };
    await admin.messaging().send(message);
    console.log(`Push sent successfully to user ${userId}`);
  } catch (err) {
    console.error(`Error sending push notification to user ${userId}:`, err);
  }
};
