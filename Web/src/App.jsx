import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Users } from './pages/Users';
import { Vendors } from './pages/Vendors';
import { Leads } from './pages/Leads';
import { Revenue } from './pages/Revenue';
import { Notifications } from './pages/Notifications';
import { JobPortal } from './pages/JobPortal';
import { OpenAds } from './pages/OpenAds';
import { GenuineVerifications } from './pages/GenuineVerifications';
import { JobPayments } from './pages/JobPayments';
import { ServicePayments } from './pages/ServicePayments';
import { VendorTransactions } from './pages/VendorTransactions';
import { VendorAnalytics } from './pages/VendorAnalytics';
import { VendorLeadsTransfer } from './pages/VendorLeadsTransfer';
import { Banners } from './pages/Banners';
import { PricingSettings } from './pages/PricingSettings';
import { SupportMessages } from './pages/SupportMessages';
import { Services } from './pages/Services';
import { Categories } from './pages/Categories';
import { AllTransactions } from './pages/AllTransactions';
import { UnverifiedUsers } from './pages/UnverifiedUsers';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';
import Home from './pages/Home';
import { AdminLogin } from './pages/AdminLogin';
import { EmployeeLogin } from './pages/EmployeeLogin';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsConditions } from './pages/TermsConditions';
import { AccountDeletion } from './pages/AccountDeletion';
import { Brand } from './pages/Brand';
import { Employees } from './pages/Employees';
function App() {
  return (
    <ErrorBoundary>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<AdminLogin />} />
          <Route path="/employee-login" element={<EmployeeLogin />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-conditions" element={<TermsConditions />} />
          <Route path="/deleteaccount" element={<AccountDeletion />} />

          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/users" element={<Users />} />
          <Route path="/unverified-users" element={<UnverifiedUsers />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/vendors/leads" element={<VendorLeadsTransfer />} />
          <Route path="/vendors/analytics" element={<VendorAnalytics />} />
          <Route path="/vendors/transactions" element={<VendorTransactions />} />
          <Route path="/jobs" element={<JobPortal />} />
          <Route path="/jobs/paid" element={<JobPortal />} />
          <Route path="/jobs/user" element={<JobPortal />} />
          <Route path="/jobs/ads" element={<OpenAds />} />
          <Route path="/jobs/verifications" element={<GenuineVerifications />} />
          <Route path="/jobs/payments" element={<JobPayments />} />
          <Route path="/services" element={<Services />} />
          <Route path="/services/ads" element={<OpenAds />} />
          <Route path="/services/payments" element={<ServicePayments />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/revenue" element={<Revenue />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/banners" element={<Banners />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/pricing" element={<PricingSettings />} />
          <Route path="/service-areas" element={<AllTransactions />} />
          <Route path="/all-transactions" element={<AllTransactions />} />
          <Route path="/support-messages" element={<SupportMessages />} />
          <Route path="/brand" element={<Brand />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
export default App;
