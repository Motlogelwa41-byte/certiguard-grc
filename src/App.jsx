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
import OAuthConsent from '@/pages/OAuthConsent';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Frameworks from '@/pages/Frameworks';
import Controls from '@/pages/Controls';
import ControlDetail from '@/pages/ControlDetail';
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
import FrameworkProgress from '@/pages/FrameworkProgress';
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
import ControlTests from '@/pages/ControlTests';
import AuditorPortal from '@/pages/AuditorPortal';
import AuditorScopeAdmin from '@/pages/AuditorScopeAdmin';
import Certifications from '@/pages/Certifications';
import CertificationDetail from '@/pages/CertificationDetail';
import SecurityQuestionnaires from '@/pages/SecurityQuestionnaires';
import QuestionnaireDetail from '@/pages/QuestionnaireDetail';
import PenTests from '@/pages/PenTests';
import PenTestDetail from '@/pages/PenTestDetail';
import PrivacyRequests from '@/pages/PrivacyRequests';
import PrivacyRequestDetail from '@/pages/PrivacyRequestDetail';
import RiskQuantification from '@/pages/RiskQuantification';
import IndustryDashboard from '@/pages/IndustryDashboard';
import FinancialServicesDashboard from '@/pages/FinancialServicesDashboard';
import Connections from '@/pages/Connections';
import AccessRecertification from '@/pages/AccessRecertification';
import OnboardingWizard from '@/pages/OnboardingWizard';
import SSOSettings from '@/pages/SSOSettings';
import Vulnerabilities from '@/pages/Vulnerabilities';
import ControlLibraries from '@/pages/ControlLibraries';
import BoardReport from '@/pages/BoardReport';
import ExecutiveRiskSummary from '@/pages/ExecutiveRiskSummary';
import CalendarSync from '@/pages/CalendarSync';
import GuidedOnboarding from '@/pages/GuidedOnboarding';
import AuditReadinessReport from '@/pages/AuditReadinessReport';
import ActivityLog from '@/pages/ActivityLog';
import PlatformGovernance from '@/pages/PlatformGovernance';
import GrcEducation from '@/pages/GrcEducation';
import MaturityDashboard from '@/pages/MaturityDashboard';
import ExecutiveRiskReport from '@/pages/ExecutiveRiskReport';
import ComplianceReadinessReport from '@/pages/ComplianceReadinessReport';
import ExecutiveSummary from '@/pages/ExecutiveSummary';
import Architecture from '@/pages/Architecture';
import SecurityCommandCenter from '@/pages/SecurityCommandCenter';
import TestingChecklist from '@/pages/TestingChecklist';
import StakeholderSummary from '@/pages/StakeholderSummary';
import AuditorLinkAccess from '@/pages/AuditorLinkAccess';
import UserGuide from '@/pages/UserGuide';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import Terms from '@/pages/Terms';
import DataPrivacy from '@/pages/DataPrivacy';
import SLA from '@/pages/SLA';
import DataResidency from '@/pages/DataResidency';
import SecurityOverview from '@/pages/SecurityOverview';
import ExecutiveReadinessDashboard from '@/pages/ExecutiveReadinessDashboard';
import AuditorExport from '@/pages/AuditorExport';
import TenantSettings from '@/pages/TenantSettings';
import MyPolicies from '@/pages/MyPolicies';
import VendorPortal from '@/pages/VendorPortal';
import AuditorDashboard from '@/pages/AuditorDashboard';
import ExecutiveReport from '@/pages/ExecutiveReport';
import ApiDocs from '@/pages/ApiDocs';
import ControlTestLibrary from '@/pages/ControlTestLibrary';
import CloudPosture from '@/pages/CloudPosture';
import SiemWebhooks from '@/pages/SiemWebhooks';
import EsgReporting from '@/pages/EsgReporting';
import ComplianceBenchmarking from '@/pages/ComplianceBenchmarking';
import Contracts from '@/pages/Contracts';
import EdrDashboard from '@/pages/EdrDashboard';
import HrisDirectory from '@/pages/HrisDirectory';
import TestingAgent from '@/pages/TestingAgent';
import OneClickReport from '@/pages/OneClickReport';
import BusinessUnits from '@/pages/BusinessUnits';
import KpiKri from '@/pages/KpiKri';
import Landing from '@/pages/Landing';
import { LanguageProvider } from '@/contexts/LanguageContext';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user, isAuthenticated } = useAuth();

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

  // External auditors are redirected to an isolated, sidebar-free dashboard
  if (isAuthenticated && user?.role === 'external_auditor' && !window.location.pathname.startsWith('/auditor-dashboard')) {
    return <Navigate to="/auditor-dashboard" replace />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/oauth/consent" element={<OAuthConsent />} />
      <Route path="/landing" element={<Landing />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/vendor-questionnaire" element={<VendorQuestionnaire />} />
      <Route path="/vendor-portal" element={<VendorPortal />} />
      <Route path="/trust-center" element={<TrustCenterPublic />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/sla" element={<SLA />} />
      <Route path="/data-residency" element={<DataResidency />} />
      <Route path="/security-overview" element={<SecurityOverview />} />
      <Route path="/auditor-link/:token" element={<AuditorLinkAccess />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/auditor-dashboard" element={<AuditorDashboard />} />
        <Route element={<TenantProvider><AppLayout /></TenantProvider>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/frameworks" element={<Frameworks />} />
          <Route path="/controls" element={<Controls />} />
          <Route path="/controls/:id" element={<ControlDetail />} />
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
          <Route path="/framework-progress" element={<FrameworkProgress />} />
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
          <Route path="/control-tests" element={<ControlTests />} />
          <Route path="/auditor-portal" element={<AuditorPortal />} />
          <Route path="/auditor-scope" element={<AuditorScopeAdmin />} />
          <Route path="/certifications" element={<Certifications />} />
          <Route path="/certifications/:id" element={<CertificationDetail />} />
          <Route path="/questionnaires" element={<SecurityQuestionnaires />} />
          <Route path="/questionnaires/:id" element={<QuestionnaireDetail />} />
          <Route path="/pen-tests" element={<PenTests />} />
          <Route path="/pen-tests/:id" element={<PenTestDetail />} />
          <Route path="/privacy-requests" element={<PrivacyRequests />} />
          <Route path="/privacy-requests/:id" element={<PrivacyRequestDetail />} />
          <Route path="/risk-quantification" element={<RiskQuantification />} />
          <Route path="/industry-dashboard" element={<IndustryDashboard />} />
          <Route path="/financial-dashboard" element={<FinancialServicesDashboard />} />
          <Route path="/connections" element={<Connections />} />
          <Route path="/access-recertification" element={<AccessRecertification />} />
          <Route path="/onboarding" element={<OnboardingWizard />} />
          <Route path="/sso" element={<SSOSettings />} />
          <Route path="/vulnerabilities" element={<Vulnerabilities />} />
          <Route path="/control-libraries" element={<ControlLibraries />} />
          <Route path="/board-report" element={<BoardReport />} />
          <Route path="/executive-risk-summary" element={<ExecutiveRiskSummary />} />
          <Route path="/calendar-sync" element={<CalendarSync />} />
          <Route path="/guided-onboarding" element={<GuidedOnboarding />} />
          <Route path="/audit-readiness-report" element={<AuditReadinessReport />} />
          <Route path="/activity-log" element={<ActivityLog />} />
          <Route path="/platform-governance" element={<PlatformGovernance />} />
          <Route path="/grc-education" element={<GrcEducation />} />
          <Route path="/maturity-dashboard" element={<MaturityDashboard />} />
          <Route path="/executive-risk-report" element={<ExecutiveRiskReport />} />
          <Route path="/compliance-readiness-report" element={<ComplianceReadinessReport />} />
          <Route path="/executive-summary" element={<ExecutiveSummary />} />
          <Route path="/architecture" element={<Architecture />} />
          <Route path="/security-command-center" element={<SecurityCommandCenter />} />
          <Route path="/testing-checklist" element={<TestingChecklist />} />
          <Route path="/stakeholder-summary" element={<StakeholderSummary />} />
          <Route path="/user-guide" element={<UserGuide />} />
          <Route path="/data-privacy" element={<DataPrivacy />} />
          <Route path="/executive-readiness-dashboard" element={<ExecutiveReadinessDashboard />} />
          <Route path="/auditor-export" element={<AuditorExport />} />
          <Route path="/tenant-settings" element={<TenantSettings />} />
          <Route path="/my-policies" element={<MyPolicies />} />
          <Route path="/executive-report" element={<ExecutiveReport />} />
          <Route path="/api-docs" element={<ApiDocs />} />
          <Route path="/control-test-library" element={<ControlTestLibrary />} />
          <Route path="/cloud-posture" element={<CloudPosture />} />
          <Route path="/siem-webhooks" element={<SiemWebhooks />} />
          <Route path="/esg-reporting" element={<EsgReporting />} />
          <Route path="/compliance-benchmarking" element={<ComplianceBenchmarking />} />
          <Route path="/contracts" element={<Contracts />} />
          <Route path="/edr-dashboard" element={<EdrDashboard />} />
          <Route path="/hris-directory" element={<HrisDirectory />} />
          <Route path="/testing-agent" element={<TestingAgent />} />
          <Route path="/one-click-report" element={<OneClickReport />} />
          <Route path="/business-units" element={<BusinessUnits />} />
          <Route path="/kpi-kri" element={<KpiKri />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <ScrollToTop />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </LanguageProvider>
    </AuthProvider>
  )
}

export default App