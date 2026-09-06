import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '@/pages/cashier/LoginPage';
import { InvitationCodePage } from '@/pages/cashier/InvitationCodePage';
import { SignupPage } from '@/pages/cashier/SignupPage';
import { VerifyOtpPage } from '@/pages/cashier/VerifyOtpPage';
import { PendingApprovalPage } from '@/pages/cashier/PendingApprovalPage';
import { SessionsPage } from '@/pages/cashier/SessionsPage';
import { BillingPage } from '@/pages/cashier/BillingPage';
import { InventoryPage } from '@/pages/cashier/InventoryPage';
import { ReportsPage } from '@/pages/cashier/ReportsPage';
import { HistoryPage } from '@/pages/cashier/HistoryPage';
import { SettingsPage } from '@/pages/cashier/SettingsPage';
import { ProfilePage } from '@/pages/cashier/ProfilePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { CashierLayout } from '@/components/layout/CashierLayout';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { SessionGate } from '@/routes/SessionGate';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/cashier/billing" replace />} />
      <Route path="/cashier/login" element={<LoginPage />} />
      {/* Cashier Sign Up -> Invite Code -> Account Details -> Complete Registration */}
      <Route path="/cashier/signup" element={<InvitationCodePage />} />
      <Route path="/cashier/signup/account" element={<SignupPage />} />
      <Route path="/cashier/signup/verify" element={<VerifyOtpPage />} />
      <Route path="/cashier/signup/pending" element={<PendingApprovalPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<CashierLayout />}>
          {/* Session must be started before billing/inventory/etc are usable */}
          <Route path="/cashier/sessions" element={<SessionsPage />} />
          <Route path="/cashier/settings" element={<SettingsPage />} />
          <Route path="/cashier/profile" element={<ProfilePage />} />

          <Route element={<SessionGate />}>
            <Route path="/cashier/billing" element={<BillingPage />} />
            <Route path="/cashier/inventory" element={<InventoryPage />} />
            <Route path="/cashier/reports" element={<ReportsPage />} />
            <Route path="/cashier/history" element={<HistoryPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
