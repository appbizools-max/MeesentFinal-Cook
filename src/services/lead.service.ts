import { collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc, increment } from 'firebase/firestore';
import { db, auth } from './firebase';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds

export interface VendorLeadData {
  id?: string;
  vendorId: string;
  vendorName?: string;
  vendorOwnerId?: string;
  userId: string;
  userName: string;
  userPhone: string;
  type: 'view' | 'call' | 'whatsapp' | 'direction';
  hasCalled?: boolean;
  hasWhatsApp?: boolean;
  createdAt: string;
  updatedAt?: string;
}

class LeadService {
  /**
   * Helper to retrieve current authenticated user's name & phone.
   */
  private async getUserDetails(userId: string) {
    let userName = 'Guest User';
    let userPhone = '';

    const currentUser = auth.currentUser;
    if (currentUser) {
      userName = currentUser.displayName || currentUser.email?.split('@')[0] || 'Guest User';
      userPhone = currentUser.phoneNumber || '';
    }

    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData?.name) userName = userData.name;
        if (userData?.phoneNumber) userPhone = userData.phoneNumber;
      }
    } catch (e) {
      console.warn('[LeadService] Could not fetch detailed user doc:', e);
    }

    return { userName, userPhone };
  }

  /**
   * Resolves the vendor's owner user ID from vendor object or Firestore.
   */
  private async resolveVendorOwnerId(vendor: any): Promise<string> {
    let ownerId = vendor?.ownerId || vendor?.userId;
    const vendorId = vendor?.id || vendor?.vendorId;
    if (!ownerId && vendorId) {
      try {
        const vSnap = await getDoc(doc(db, 'vendors', vendorId));
        if (vSnap.exists()) {
          const vData = vSnap.data();
          ownerId = vData?.userId || vData?.ownerId;
        }
      } catch (err: any) {
        console.warn('[LeadService] Error resolving vendor owner ID:', err?.message);
      }
    }
    return ownerId || '';
  }

  /**
   * Dispatches instant push notification and Firestore notification to vendor.
   * Includes screen: 'MyLeads' for deep-linking directly to My Leads section on tap.
   */
  private async notifyVendor(vendorOwnerId: string, title: string, message: string, type: string) {
    if (!vendorOwnerId) return;
    const nowIso = new Date().toISOString();

    // 1. Save notification record to Firestore
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: vendorOwnerId,
        title,
        message,
        body: message,
        type,
        screen: 'MyLeads',
        read: false,
        createdAt: nowIso,
      });
    } catch (err: any) {
      console.warn('[LeadService] Notification doc error:', err);
    }

    // 2. Trigger instant push notification via backend server FCM endpoint
    try {
      fetch('http://10.0.2.2:5000/api/send-lead-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorOwnerId,
          title,
          message,
          type,
        }),
      }).catch(() => { });
    } catch (_) { }
  }

  /**
   * Finds any lead logged for this customer and vendor within the last 7 days (1 week).
   */
  private async getLeadWithinOneWeek(vendorId: string, userId: string) {
    try {
      const q = query(
        collection(db, 'leads'),
        where('vendorId', '==', vendorId),
        where('userId', '==', userId)
      );

      const snap = await getDocs(q);
      if (snap.empty) return null;

      const now = Date.now();
      let mostRecentLeadDoc: any = null;
      let mostRecentTime = 0;

      snap.forEach((docSnap: any) => {
        const data = docSnap.data();
        const createdTime = new Date(data.createdAt || data.updatedAt || 0).getTime();
        if (createdTime > mostRecentTime) {
          mostRecentTime = createdTime;
          mostRecentLeadDoc = { id: docSnap.id, ...data };
        }
      });

      // Check if the most recent lead is within 7 days
      if (mostRecentLeadDoc && (now - mostRecentTime) < SEVEN_DAYS_MS) {
        return mostRecentLeadDoc;
      }
      return null;
    } catch (error) {
      console.warn('[LeadService] Error querying existing 7-day lead:', error);
      return null;
    }
  }

  /**
   * 1. Profile Visit Handler
   * Rules:
   * - If the business owner views their OWN profile, DO NOT COUNT and DO NOT NOTIFY.
   * - If a business owner views ANOTHER vendor's profile, it DOES COUNT as a lead.
   * - If the same customer revisits within 1 week (7 days), DO NOT duplicate.
   * - If 1 week has passed, it creates a new lead cycle.
   * - Instantly sends a push notification to the vendor with direct tap to My Leads.
   */
  async recordProfileView(vendor: any): Promise<void> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const vendorId = vendor.id || vendor.vendorId;
      if (!vendorId) return;

      // Resolve business owner
      const vendorOwnerId = await this.resolveVendorOwnerId(vendor);

      // Business owner viewing their own profile: ignore
      if (currentUser.uid === vendorOwnerId) {
        console.log('[LeadService] Business owner viewed their own profile — skipping count & notification.');
        return;
      }

      // Check for existing lead within 1 week (7 days)
      const existingLead = await this.getLeadWithinOneWeek(vendorId, currentUser.uid);
      if (existingLead) {
        // Customer already visited or contacted within 7 days; do not create duplicate lead
        return;
      }

      const { userName, userPhone } = await this.getUserDetails(currentUser.uid);
      const nowIso = new Date().toISOString();

      // Create new lead with type 'view'
      await addDoc(collection(db, 'leads'), {
        vendorId,
        vendorName: vendor.businessName || 'Business',
        vendorOwnerId: vendorOwnerId || '',
        userId: currentUser.uid,
        userName,
        userPhone,
        type: 'view',
        hasCalled: false,
        hasWhatsApp: false,
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      // Increment vendor views
      updateDoc(doc(db, 'vendors', vendorId), {
        viewsCount: increment(1),
        views: increment(1),
      }).catch((err: any) => console.log('[LeadService] Increment view error:', err));

      // Instantly notify vendor owner (with deep link to My Leads)
      if (vendorOwnerId && vendorOwnerId !== currentUser.uid) {
        const notifTitle = 'New Profile Visitor 👀';
        const notifMsg = `Someone viewed your business "${vendor.businessName || 'Business'}". Tap to check in My Leads!`;
        this.notifyVendor(vendorOwnerId, notifTitle, notifMsg, 'profile_view');
      }
    } catch (error) {
      console.warn('[LeadService] recordProfileView error:', error);
    }
  }

  /**
   * 2. Call Handler
   * Rules:
   * - If business owner taps call on own listing, ignore.
   * - If customer previously visited within this week, convert that visit to a Call (Calls +1, Profile Visits -1).
   * - Total Leads remains 1 (same customer lead upgraded).
   * - If no prior lead existed in the last 7 days, creates a Call lead.
   * - Instantly notifies the vendor.
   */
  async recordCall(vendor: any): Promise<void> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const vendorId = vendor.id || vendor.vendorId;
      if (!vendorId) return;

      const vendorOwnerId = await this.resolveVendorOwnerId(vendor);
      if (currentUser.uid === vendorOwnerId) return;

      const existingLead = await this.getLeadWithinOneWeek(vendorId, currentUser.uid);
      const nowIso = new Date().toISOString();

      if (existingLead) {
        // Upgrade existing lead document
        const wasViewOnly = existingLead.type === 'view' && !existingLead.hasCalled && !existingLead.hasWhatsApp;

        await updateDoc(doc(db, 'leads', existingLead.id), {
          type: 'call',
          hasCalled: true,
          updatedAt: nowIso,
        });

        // Update vendor statistics
        const vendorUpdates: any = {
          callsCount: increment(1),
          calls: increment(1),
        };
        // Deduct from views if it was just a view before
        if (wasViewOnly) {
          vendorUpdates.viewsCount = increment(-1);
          vendorUpdates.views = increment(-1);
        }
        updateDoc(doc(db, 'vendors', vendorId), vendorUpdates).catch((err: any) =>
          console.log('[LeadService] Vendor call update error:', err)
        );
      } else {
        // No lead existed in 7 days — create fresh Call lead
        const { userName, userPhone } = await this.getUserDetails(currentUser.uid);

        await addDoc(collection(db, 'leads'), {
          vendorId,
          vendorName: vendor.businessName || 'Business',
          vendorOwnerId: vendorOwnerId || '',
          userId: currentUser.uid,
          userName,
          userPhone,
          type: 'call',
          hasCalled: true,
          hasWhatsApp: false,
          createdAt: nowIso,
          updatedAt: nowIso,
        });

        updateDoc(doc(db, 'vendors', vendorId), {
          callsCount: increment(1),
          calls: increment(1),
        }).catch((err: any) => console.log('[LeadService] Vendor fresh call update error:', err));
      }

      // Notify vendor of incoming call lead
      if (vendorOwnerId && vendorOwnerId !== currentUser.uid) {
        this.notifyVendor(
          vendorOwnerId,
          'Direct Call Lead 📞',
          `Someone tapped to call your business "${vendor.businessName || 'Business'}". Tap to check in My Leads!`,
          'call_lead'
        );
      }
    } catch (error) {
      console.warn('[LeadService] recordCall error:', error);
    }
  }

  /**
   * 3. WhatsApp Handler
   * Rules:
   * - If business owner taps whatsapp on own listing, ignore.
   * - If customer previously visited within this week, convert that visit to WhatsApp (WhatsApp +1, Profile Visits -1).
   * - Total Leads remains 1 (same customer lead upgraded).
   * - If no prior lead existed in the last 7 days, creates a WhatsApp lead.
   * - Instantly notifies the vendor.
   */
  async recordWhatsApp(vendor: any): Promise<void> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const vendorId = vendor.id || vendor.vendorId;
      if (!vendorId) return;

      const vendorOwnerId = await this.resolveVendorOwnerId(vendor);
      if (currentUser.uid === vendorOwnerId) return;

      const existingLead = await this.getLeadWithinOneWeek(vendorId, currentUser.uid);
      const nowIso = new Date().toISOString();

      if (existingLead) {
        const wasViewOnly = existingLead.type === 'view' && !existingLead.hasCalled && !existingLead.hasWhatsApp;

        await updateDoc(doc(db, 'leads', existingLead.id), {
          type: existingLead.hasCalled ? 'call' : 'whatsapp',
          hasWhatsApp: true,
          updatedAt: nowIso,
        });
        const vendorUpdates: any = {
          whatsappCount: increment(1),
          whatsapp: increment(1),
        };
        if (wasViewOnly) {
          vendorUpdates.viewsCount = increment(-1);
          vendorUpdates.views = increment(-1);
        }
        updateDoc(doc(db, 'vendors', vendorId), vendorUpdates).catch((err: any) =>
          console.log('[LeadService] Vendor whatsapp update error:', err)
        );
      } else {
        const { userName, userPhone } = await this.getUserDetails(currentUser.uid);

        await addDoc(collection(db, 'leads'), {
          vendorId,
          vendorName: vendor.businessName || 'Business',
          vendorOwnerId: vendorOwnerId || '',
          userId: currentUser.uid,
          userName,
          userPhone,
          type: 'whatsapp',
          hasCalled: false,
          hasWhatsApp: true,
          createdAt: nowIso,
          updatedAt: nowIso,
        });

        updateDoc(doc(db, 'vendors', vendorId), {
          whatsappCount: increment(1),
          whatsapp: increment(1),
        }).catch((err: any) => console.log('[LeadService] Vendor fresh whatsapp update error:', err));
      }

      if (vendorOwnerId && vendorOwnerId !== currentUser.uid) {
        this.notifyVendor(
          vendorOwnerId,
          'WhatsApp Inquiry 💬',
          `Someone started a WhatsApp chat with "${vendor.businessName || 'Business'}". Tap to check in My Leads!`,
          'whatsapp_lead'
        );
      }
    } catch (error) {
      console.warn('[LeadService] recordWhatsApp error:', error);
    }
  }

  /**
   * Evaluates the minimum business guarantee for a vendor's paid plan:
   * Rule: In the plan's billing period (e.g. 1 month):
   * - If profile visits >= 5 OR calls >= 1 OR whatsapp >= 1:
   *     The guarantee was fulfilled. Plan expires normally.
   * - If none of these criteria were met (visits < 5 && calls == 0 && whatsapp == 0):
   *     "No Business Received" guarantee triggers ->
   *     The plan is automatically extended by +1 month for FREE (without paying).
   */
  async evaluatePlanGuarantee(business: any) {
        if (!business || !business.id) return null;

        const pId = (business.planId || business.plan || '').toLowerCase();
        // Guarantee applies to paid plans (big, small, growth, or any non-free plan)
        if (!pId || pId === 'free') {
          return null;
        }

        const rawExp = business.planExpiry || business.currentPeriodEnd || business.planEndDate || business.expiryDate;
        if (!rawExp) return null;

        let expiryDate: Date;
        try {
          expiryDate = rawExp?.toDate ? rawExp.toDate() : new Date(rawExp);
          if (isNaN(expiryDate.getTime())) return null;
        } catch {
          return null;
        }

        const now = new Date();
        // Only evaluate guarantee when the plan has reached or passed its expiry date
        if (expiryDate > now) {
          return { status: 'in_progress', expiryDate };
        }

        // Determine cycle start date (default to 1 month before expiry if not specified)
        let cycleStartDate: Date;
        const rawStart = business.planStartDate || business.currentPeriodStart || business.createdAt;
        if (rawStart) {
          try {
            cycleStartDate = rawStart?.toDate ? rawStart.toDate() : new Date(rawStart);
            if (isNaN(cycleStartDate.getTime())) {
              cycleStartDate = new Date(expiryDate.getTime() - 30 * 24 * 60 * 60 * 1000);
            }
          } catch {
            cycleStartDate = new Date(expiryDate.getTime() - 30 * 24 * 60 * 60 * 1000);
          }
        } else {
          cycleStartDate = new Date(expiryDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        // Query leads recorded for this vendor
        const q = query(
          collection(db, 'leads'),
          where('vendorId', '==', business.id)
        );

        let visits = 0;
        let calls = 0;
        let whatsapp = 0;

        try {
          const snap = await getDocs(q);
          snap.forEach((docSnap: any) => {
            const lead = docSnap.data();
            const leadTime = new Date(lead.createdAt || lead.updatedAt || 0).getTime();
            // Check if lead was within this billing cycle
            if (leadTime >= cycleStartDate.getTime() && leadTime <= expiryDate.getTime()) {
              if (lead.hasCalled || lead.type === 'call') {
                calls++;
              } else if (lead.hasWhatsApp || lead.type === 'whatsapp') {
                whatsapp++;
              } else {
                visits++;
              }
            }
          });
        } catch (e) {
          console.warn('[LeadService] evaluatePlanGuarantee getDocs error:', e);
        }

        // Check guarantee criteria: visits >= 5 OR calls >= 1 OR whatsapp >= 1
        const guaranteeMet = visits >= 5 || calls >= 1 || whatsapp >= 1;

        if (guaranteeMet) {
          // Guarantee was met, plan expires normally
          return {
            status: 'expired',
            guaranteeMet: true,
            visits,
            calls,
            whatsapp,
            expiryDate
          };
        }

        // GUARANTEE TRIGGERED: Vendor did NOT get minimum business.
        // Shift plan forward by +1 month for FREE!
        const newExpiryDate = new Date(expiryDate);
        newExpiryDate.setMonth(newExpiryDate.getMonth() + 1);

        const vendorOwnerId = business.userId || business.ownerId || auth.currentUser?.uid;
        const planName = pId === 'big' ? 'Premium (Big Plan)' : pId === 'small' ? 'Smart (Small Plan)' : 'Paid Plan';

        try {
          // 1. Update vendors collection
          await updateDoc(doc(db, 'vendors', business.id), {
            planExpiry: newExpiryDate.toISOString(),
            isExtended: true,
            status: 'active',
            subscriptionStatus: 'active',
            lastExtensionDate: new Date().toISOString(),
            extensionCount: increment(1),
            guaranteeNotice: 'Extended by 1 month for FREE under Minimum Business Guarantee'
          });

          // 2. Update vendorSubscriptions collection
          await updateDoc(doc(db, 'vendorSubscriptions', business.id), {
            currentPeriodEnd: newExpiryDate,
            status: 'extended',
            extensionCount: increment(1),
            updatedAt: new Date()
          }).catch(() => { });

          // 3. Notify the vendor of their free extension
          if (vendorOwnerId) {
            this.notifyVendor(
              vendorOwnerId,
              'Free 1-Month Extension Activated! 🎁',
              `Because you didn't receive the minimum business guarantee (5 visits, 1 call, or 1 WhatsApp) for "${business.businessName || 'your business'}", your ${planName} has been extended for another month at no extra cost!`,
              'plan_extended'
            );
          }

          return {
            status: 'extended',
            guaranteeMet: false,
            visits,
            calls,
            whatsapp,
            oldExpiryDate: expiryDate,
            newExpiryDate
          };
        } catch (err: any) {
          console.error('[LeadService] Error auto-extending plan:', err);
          return null;
        }
      }

      /**
       * Computes the current guarantee progress for an ongoing plan:
       * Returns { visits, calls, whatsapp, isFulfilled }
       */
      getGuaranteeProgress(leads: any[], planStartDate: Date | null, planExpiryDate: Date | null) {
        if (!planStartDate || !planExpiryDate) {
          return { visits: 0, calls: 0, whatsapp: 0, isFulfilled: false };
        }

        const startMs = planStartDate.getTime();
        const endMs = planExpiryDate.getTime();

        let visits = 0;
        let calls = 0;
        let whatsapp = 0;

        leads.forEach((lead) => {
          const leadMs = new Date(lead.createdAt || lead.updatedAt || 0).getTime();
          if (leadMs >= startMs && leadMs <= endMs) {
            if (lead.hasCalled || lead.type === 'call') {
              calls++;
            } else if (lead.hasWhatsApp || lead.type === 'whatsapp') {
              whatsapp++;
            } else {
              visits++;
            }
          }
        });

        const isFulfilled = visits >= 5 || calls >= 1 || whatsapp >= 1;
        return { visits, calls, whatsapp, isFulfilled };
      }
    }

export const leadService = new LeadService();
    export default leadService;
