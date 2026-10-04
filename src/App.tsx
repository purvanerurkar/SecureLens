import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import AuthPage from '@/pages/AuthPage';
import Dashboard from '@/pages/Dashboard';
import Applications from '@/pages/Applications';
import ApplicationDetail from '@/pages/ApplicationDetail';
import Scans from '@/pages/Scans';
import ScanDetail from '@/pages/ScanDetail';
import Vulnerabilities from '@/pages/Vulnerabilities';
import VulnerabilityDetail from '@/pages/VulnerabilityDetail';
import AIAnalyst from '@/pages/AIAnalyst';
import Remediation from '@/pages/Remediation';
import Retesting from '@/pages/Retesting';
import Reports from '@/pages/Reports';
import SettingsPage from '@/pages/Settings';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/applications" element={<Applications />} />
              <Route path="/applications/:id" element={<ApplicationDetail />} />
              <Route path="/scans" element={<Scans />} />
              <Route path="/scans/:id" element={<ScanDetail />} />
              <Route path="/vulnerabilities" element={<Vulnerabilities />} />
              <Route path="/vulnerabilities/:id" element={<VulnerabilityDetail />} />
              <Route path="/ai-analyst" element={<AIAnalyst />} />
              <Route path="/remediation" element={<Remediation />} />
              <Route path="/retesting" element={<Retesting />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/reports/:id" element={<Reports />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
