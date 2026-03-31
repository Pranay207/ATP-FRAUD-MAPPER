import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import GraphView from '@/pages/GraphView';
import Classification from '@/pages/Classification';
import Alerts from '@/pages/Alerts';
import FreezePanel from '@/pages/FreezePanel';
import Recovery from '@/pages/Recovery';
import Actions from '@/pages/Actions';
import AllInsights from '@/pages/AllInsights';
import Devices from '@/pages/Devices';
import Banks from '@/pages/Banks';
import AuditLogs from '@/pages/AuditLogs';
import { useEffect } from 'react';
import { restoreAuditLogsFromStorage } from '@/lib/auditTrail';
import { hydratePersistedAppState } from '@/lib/appState';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/graph" element={<GraphView />} />
        <Route path="/classification" element={<Classification />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/freeze" element={<FreezePanel />} />
        <Route path="/recovery" element={<Recovery />} />
        <Route path="/actions" element={<Actions />} />
        <Route path="/ai-insights" element={<AllInsights />} />
        <Route path="/devices" element={<Devices />} />
        <Route path="/banks" element={<Banks />} />
        <Route path="/audit-logs" element={<AuditLogs />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
  useEffect(() => {
    // Restore previous audit logs from localStorage on app startup
    restoreAuditLogsFromStorage();
    void hydratePersistedAppState();
  }, []);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
