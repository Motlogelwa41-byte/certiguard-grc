import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Frameworks from '@/pages/Frameworks';
import Controls from '@/pages/Controls';
import Risks from '@/pages/Risks';
import Policies from '@/pages/Policies';
import EvidenceManager from '@/pages/EvidenceManager';
import Audits from '@/pages/Audits';
import Vendors from '@/pages/Vendors';
import Tasks from '@/pages/Tasks';
import GapAnalysis from '@/pages/GapAnalysis';
import AIAuditor from '@/pages/AIAuditor';
import ComplianceRuns from '@/pages/ComplianceRuns';
import ROPA from '@/pages/ROPA';
import Reports from '@/pages/Reports';
import AuditTrail from '@/pages/AuditTrail';
import Incidents from '@/pages/Incidents';
import Training from '@/pages/Training';
import ManagementReports from '@/pages/ManagementReports';
import UserManagement from '@/pages/UserManagement';
import PolicyAcknowledgments from '@/pages/PolicyAcknowledgments';
import VendorAssessments from '@/pages/VendorAssessments';
import VendorScorecard from '@/pages/VendorScorecard';
import FrameworkControlMap from '@/pages/FrameworkControlMap';
import ComplianceCalendar from '@/pages/ComplianceCalendar';
import PolicyTemplates from '@/pages/PolicyTemplates';
import NotificationPreferences from '@/pages/NotificationPreferences';
import Notifications from '@/pages/Notifications';
import SecurityCenter from '@/pages/SecurityCenter';
import Pricing from '@/pages/Pricing';
import TenantAdmin from '@/pages/TenantAdmin';
import { TenantProvider } from '@/lib/TenantContext';
import VendorQuestionnaire from '@/pages/VendorQuestionnaire';
import TaskReminders from '@/pages/TaskReminders';
import RiskHeatmap from '@/pages/RiskHeatmap';
import BulkEvidenceUploader from '@/pages/BulkEvidenceUploader';
import PostureDashboard from '@/pages/PostureDashboard';
import EvidenceReminders from '@/pages/EvidenceReminders';
import ScheduledReports from '@/pages/ScheduledReports';
import AuditChecklist from '@/pages/AuditChecklist';
import SADCFrameworks from '@/pages/SADCFrameworks';
import AIControlMapper from '@/pages/AIControlMapper';
import PeopleDashboard from '@/pages/PeopleDashboard';
import TrustCenterSettings from '@/pages/TrustCenterSettings';
import TrustCenterPublic from '@/pages/TrustCenterPublic';
import SecurityPosture from '@/pages/SecurityPosture';
import AIHub from '@/pages/AIHub';
import AuditFindings from '@/pages/AuditFindings';
import IncidentCommand from '@/pages/IncidentCommand';
import ManagementDashboard from '@/pages/ManagementDashboard';
import SADCExecutiveDashboard from '@/pages/SADCExecutiveDashboard';
import RiskAppetiteHeatmap from '@/pages/RiskAppetiteHeatmap';
import RiskFrameworkCrossMap from '@/pages/RiskFrameworkCrossMap';
import AIAssistant from '@/pages/AIAssistant';
import Billing from '@/pages/Billing';
import About from '@/pages/About';
import RegulatoryChanges from '@/pages/RegulatoryChanges';
import DPIA from '@/pages/DPIA';
import ContinuousMonitoring from '@/pages/ContinuousMonitoring';
import IndustryDashboard from '@/pages/IndustryDashboard';
import FinancialServicesDashboard from '@/pages/FinancialServicesDashboard';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/vendor-questionnaire" element={<VendorQuestionnaire />} />
      <Route path="/trust-center" element={<TrustCenterPublic />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<TenantProvider><AppLayout /></TenantProvider>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/frameworks" element={<Frameworks />} />
          <Route path="/controls" element={<Controls />} />
          <Route path="/risks" element={<Risks />} />
          <Route path="/policies" element={<Policies />} />
          <Route path="/evidence" element={<EvidenceManager />} />
          <Route path="/audits" element={<Audits />} />
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/gap-analysis" element={<GapAnalysis />} />
          <Route path="/ai-auditor" element={<AIAuditor />} />
          <Route path="/compliance-runs" element={<ComplianceRuns />} />
          <Route path="/ropa" element={<ROPA />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/audit-trail" element={<AuditTrail />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/training" element={<Training />} />
          <Route path="/management-reports" element={<ManagementReports />} />
          <Route path="/calendar" element={<ComplianceCalendar />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/security" element={<SecurityCenter />} />
          <Route path="/tenant-admin" element={<TenantAdmin />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/policy-acknowledgments" element={<PolicyAcknowledgments />} />
          <Route path="/vendor-assessments" element={<VendorAssessments />} />
          <Route path="/vendor-scorecard" element={<VendorScorecard />} />
          <Route path="/framework-map" element={<FrameworkControlMap />} />
          <Route path="/policy-templates" element={<PolicyTemplates />} />
          <Route path="/notification-preferences" element={<NotificationPreferences />} />
          <Route path="/task-reminders" element={<TaskReminders />} />
          <Route path="/risk-heatmap" element={<RiskHeatmap />} />
          <Route path="/bulk-evidence" element={<BulkEvidenceUploader />} />
          <Route path="/posture" element={<PostureDashboard />} />
          <Route path="/evidence-reminders" element={<EvidenceReminders />} />
          <Route path="/scheduled-reports" element={<ScheduledReports />} />
          <Route path="/audit-checklists" element={<AuditChecklist />} />
          <Route path="/trust-center-settings" element={<TrustCenterSettings />} />
          <Route path="/sadc-frameworks" element={<SADCFrameworks />} />
          <Route path="/ai-control-mapper" element={<AIControlMapper />} />
          <Route path="/people" element={<PeopleDashboard />} />
          <Route path="/security-posture" element={<SecurityPosture />} />
          <Route path="/ai-hub" element={<AIHub />} />
          <Route path="/audit-findings" element={<AuditFindings />} />
          <Route path="/incident-command" element={<IncidentCommand />} />
          <Route path="/management-dashboard" element={<ManagementDashboard />} />
          <Route path="/sadc-executive-dashboard" element={<SADCExecutiveDashboard />} />
          <Route path="/risk-appetite-heatmap" element={<RiskAppetiteHeatmap />} />
          <Route path="/risk-framework-crossmap" element={<RiskFrameworkCrossMap />} />
          <Route path="/ai-assistant" element={<AIAssistant />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/about" element={<About />} />
          <Route path="/regulatory-changes" element={<RegulatoryChanges />} />
          <Route path="/dpia" element={<DPIA />} />
          <Route path="/control-monitoring" element={<ContinuousMonitoring />} />
          <Route path="/industry-dashboard" element={<IndustryDashboard />} />
          <Route path="/financial-dashboard" element={<FinancialServicesDashboard />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App