import {
  getAuth,
  ConfirmationResult,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

class AuthService {
  private auth = getAuth();
  private confirmationResult: any = null;

  // Store and retrieve confirmation result (to avoid non-serializable navigation params)
  setConfirmationResult(result: any) {
    this.confirmationResult = result;
  }

  getConfirmationResult() {
    return this.confirmationResult;
  }

  // Send OTP using Real Native Phone Auth
  async sendOTP(phoneNumber: string, recaptchaVerifier: any): Promise<any> {
    try {
      const digitsOnly = phoneNumber.replace(/[^0-9]/g, '');
      const tenDigits = digitsOnly.length > 10 ? digitsOnly.slice(-10) : digitsOnly;

      try {
        const [deletedDocWithCode, deletedDocTen] = await Promise.all([
          getDoc(doc(db, 'deleted_accounts', digitsOnly)),
          getDoc(doc(db, 'deleted_accounts', tenDigits)),
        ]);

        if ((deletedDocWithCode && deletedDocWithCode.exists()) || (deletedDocTen && deletedDocTen.exists())) {
          throw new Error('Your account is currently scheduled for deletion. Please wait for the 90-day retention period to complete before creating a new account.');
        }
      } catch (checkErr: any) {
        if (checkErr.message && checkErr.message.includes('deletion')) {
          throw checkErr;
        }
        // Log transient firestore availability warning without blocking OTP dispatch
        console.warn('Firestore deleted_accounts check transient warning (continuing OTP dispatch):', checkErr?.message || checkErr);
      }

      // Send OTP via Native Firebase Auth
      const confirmation = await this.auth.signInWithPhoneNumber(phoneNumber);
      return confirmation;
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      throw error;
    }
  }

  // Verify OTP using Real Native Confirmation
  async verifyOTP(confirmation: any, otp: string) {
    try {
      const credential = await confirmation.confirm(otp);
      const user = credential.user;
      const phoneNumber = user.phoneNumber;

      // Check if user exists in Firestore with transient error fallback
      let userDoc: any = null;
      try {
        userDoc = await getDoc(doc(db, 'users', user.uid));
      } catch (docErr: any) {
        console.warn('Firestore user lookup transient warning:', docErr?.message || docErr);
      }

      if (!userDoc || !userDoc.exists()) {
        // Create new user document
        await setDoc(doc(db, 'users', user.uid), {
          userId: user.uid,
          phoneNumber: phoneNumber,
          registrationDate: serverTimestamp(),
          lastLogin: serverTimestamp(),
          userType: 'regular',
          isActive: true,
          isSuspended: false,
          subscriptionPlan: {
            planId: 'free',
            status: 'active',
            startDate: serverTimestamp(),
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        return { user, isNewUser: true };
      } else {
        // Update last login
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            lastLogin: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (updateErr: any) {
          console.warn('Firestore update lastLogin warning:', updateErr?.message || updateErr);
        }

        return { user, isNewUser: false };
      }
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      throw new Error(error.message || 'Invalid OTP');
    }
  }

  // Sign out
  async signOut() {
    try {
      await this.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  // Get current user
  getCurrentUser() {
    return this.auth.currentUser;
  }

  // Listen to auth state changes
  onAuthStateChanged(callback: (user: any) => void) {
    return this.auth.onAuthStateChanged(callback);
  }
}

export default new AuthService();
