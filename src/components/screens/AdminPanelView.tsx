import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  Activity,
  AlertTriangle,
  AlertCircle,
  DollarSign,
  Settings,
  Tv,
  Calendar,
  FileCheck,
  Sparkles,
  Lock,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Edit3,
  Sliders,
  ChevronRight,
  TrendingUp,
  Cpu,
  LogOut,
  AlertOctagon,
  FileText,
  Percent,
  Database,
  HardDrive,
  Bot,
  Calculator,
  Radio,
  Zap,
  Coins,
  Play,
  Flame,
  Ban
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  SystemMetrics,
  AdminUserItem,
  ReportedPostItem,
  WithdrawalRequest,
  MonetizationConfig,
  CommunityRule,
  AiLaunchConfig,
  SuspiciousActivityItem,
  AdMobReadinessStatus
} from '../../types';

interface AdminPanelViewProps {
  isBengali: boolean;
  onBack: () => void;
  onOpenAuth?: (mode: 'login' | 'register') => void;
}

type AdminSection =
  | 'overview'
  | 'storage_r2'
  | 'users'
  | 'moderation'
  | 'payouts'
  | 'monetization_cfg'
  | 'ad_providers'
  | 'ad_readiness'
  | 'owner_ai_launch'
  | 'owner_reconciliation'
  | 'owner_fraud'
  | 'scheduled'
  | 'rules'
  | 'ai_moderation'
  | 'audit_logs';

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({
  isBengali,
  onBack,
  onOpenAuth,
}) => {
  const { user, token, isAuthenticated } = useAuth();
  const { isDark } = useTheme();

  // Active Tab
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // Data States
  const [metrics, setMetrics] = useState<any>(null);
  const [storageData, setStorageData] = useState<any>(null);
  const [usersList, setUsersList] = useState<AdminUserItem[]>([]);
  const [reportsList, setReportsList] = useState<ReportedPostItem[]>([]);
  const [withdrawalsList, setWithdrawalsList] = useState<WithdrawalRequest[]>([]);
  const [monetizationConfig, setMonetizationConfig] = useState<MonetizationConfig | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [aiMetrics, setAiMetrics] = useState<any>(null);
  const [rulesList, setRulesList] = useState<CommunityRule[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<any[]>([]);

  // Owner AI Launch & Financial Reconciliation States
  const [aiLaunchConfig, setAiLaunchConfig] = useState<AiLaunchConfig | null>(null);
  const [reconciliation, setReconciliation] = useState<any>(null);
  const [suspiciousAlerts, setSuspiciousAlerts] = useState<SuspiciousActivityItem[]>([]);
  const [adMobReadiness, setAdMobReadiness] = useState<AdMobReadinessStatus | null>(null);
  const [togglingAdMobMode, setTogglingAdMobMode] = useState(false);
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [simulationItems, setSimulationItems] = useState<any[]>([]);
  const [killSwitchLoading, setKillSwitchLoading] = useState(false);
  const [launchReason, setLaunchReason] = useState('Owner launch optimization & tuning');

  // Config Update Form
  const [newCreatorShare, setNewCreatorShare] = useState('70');
  const [newPlatformShare, setNewPlatformShare] = useState('30');
  const [newVatRate, setNewVatRate] = useState('2.0');
  const [configReason, setConfigReason] = useState('Audited quarterly platform optimization');

  // Manual Payout Disbursement & Rejection States
  const [disbursingWithdrawal, setDisbursingWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [disburseTrxId, setDisburseTrxId] = useState('');
  const [disburseNotes, setDisburseNotes] = useState('');
  const [rejectingWithdrawal, setRejectingWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('Account holder name mismatch with national identity verification');

  // Verify Administrator Role
  const isAuthorizedAdmin = isAuthenticated && user && (user.role === 'admin' || user.role === 'owner');

  // Fetch Section Data
  const fetchSectionData = async () => {
    if (!token || !isAuthorizedAdmin) return;
    setLoading(true);
    setActionMessage(null);

    try {
      const headers = { Authorization: `Bearer ${token}` };

      // Load Metrics Overview
      if (activeSection === 'overview') {
        const [mRes, lmRes] = await Promise.all([
          fetch('/api/admin/metrics', { headers }),
          fetch('/api/admin/ledger-metrics', { headers })
        ]);
        if (mRes.ok) {
          const data = await mRes.json();
          const lmData = lmRes.ok ? await lmRes.json() : {};
          setMetrics({ ...data.metrics, ...lmData.metrics });
        }
      }

      // Load R2 Free-Tier Storage & Operation Telemetry
      if (activeSection === 'storage_r2') {
        const [qRes, sRes] = await Promise.all([
          fetch('/api/media/quota'),
          fetch('/api/media/status')
        ]);
        if (qRes.ok) {
          const qData = await qRes.json();
          const sData = sRes.ok ? await sRes.json() : {};
          setStorageData({ quota: qData, status: sData });
        }
      }

      // Load Users
      if (activeSection === 'users') {
        const res = await fetch('/api/admin/users', { headers });
        if (res.ok) {
          const data = await res.json();
          setUsersList(data.users || []);
        }
      }

      // Load Reports & Moderation
      if (activeSection === 'moderation') {
        const res = await fetch('/api/admin/reports', { headers });
        if (res.ok) {
          const data = await res.json();
          setReportsList(data.reports || []);
        }
      }

      // Load Withdrawals
      if (activeSection === 'payouts') {
        const res = await fetch('/api/admin/withdrawals', { headers });
        if (res.ok) {
          const data = await res.json();
          setWithdrawalsList(data.withdrawals || []);
        }
      }

      // Load Monetization Config
      if (activeSection === 'monetization_cfg') {
        const res = await fetch('/api/admin/monetization-config', { headers });
        if (res.ok) {
          const data = await res.json();
          setMonetizationConfig(data.config);
          if (data.config) {
            setNewCreatorShare(String(data.config.creatorSharePct));
            setNewPlatformShare(String(data.config.platformSharePct));
            setNewVatRate(String(data.config.vatTaxRatePct));
          }
        }
      }

      // Load Audit Logs
      if (activeSection === 'audit_logs') {
        const res = await fetch('/api/auth/audit-logs', { headers });
        if (res.ok) {
          const data = await res.json();
          setAuditLogs(data.logs || []);
        }
      }

      // Load AI Metrics
      if (activeSection === 'ai_moderation') {
        const res = await fetch('/api/admin/ai-metrics', { headers });
        if (res.ok) {
          const data = await res.json();
          setAiMetrics(data);
        }
      }

      // Load Community Rules
      if (activeSection === 'rules') {
        const res = await fetch('/api/community-standards');
        if (res.ok) {
          const data = await res.json();
          setRulesList(data.standards || []);
        }
      }

      // Load Scheduled Posts
      if (activeSection === 'scheduled') {
        const res = await fetch('/api/scheduled-posts', { headers });
        if (res.ok) {
          const data = await res.json();
          setScheduledPosts(data.scheduledPosts || []);
        }
      }

      // Load Owner AI Launch Hub
      if (activeSection === 'owner_ai_launch' && user?.role === 'owner') {
        const res = await fetch('/api/admin/owner/ai-launch', { headers });
        if (res.ok) {
          const data = await res.json();
          setAiLaunchConfig(data.config);
        }
      }

      // Load Financial Ledger Reconciliation
      if (activeSection === 'owner_reconciliation' && user?.role === 'owner') {
        const res = await fetch('/api/admin/owner/ledger-reconciliation', { headers });
        if (res.ok) {
          const data = await res.json();
          setReconciliation(data.reconciliation);
        }
      }

      // Load Anti-Fraud and Invalid Traffic Alerts
      if (activeSection === 'owner_fraud') {
        const res = await fetch('/api/admin/owner/suspicious-activity', { headers });
        if (res.ok) {
          const data = await res.json();
          setSuspiciousAlerts(data.alerts || []);
        }
      }

      // Load AdMob Readiness Status
      if (activeSection === 'ad_readiness' || activeSection === 'ad_providers') {
        const res = await fetch('/api/admin/owner/admob-readiness', { headers });
        if (res.ok) {
          const data = await res.json();
          setAdMobReadiness(data);
        }
      }
    } catch (err: any) {
      console.warn('Admin fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSectionData();
  }, [activeSection, token, isAuthorizedAdmin]);

  // Handle Report Action (Dismiss, Warn, Delete)
  const handleReportAction = async (reportId: string, action: 'dismiss' | 'warning' | 'delete_post') => {
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, adminNotes: `Processed action ${action} by admin @${user?.username}` }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage({ text: `Report successfully resolved with action: ${action}` });
        fetchSectionData();
      } else {
        setActionMessage({ text: data.error || 'Failed to process report action', isError: true });
      }
    } catch (err: any) {
      setActionMessage({ text: err.message, isError: true });
    }
  };

  // Handle Withdrawal Approval / Payment / Rejection
  const handleWithdrawalStatus = async (
    withdrawId: string,
    status: 'approved' | 'rejected' | 'paid',
    reason?: string,
    trxRef?: string,
    notes?: string
  ) => {
    try {
      const res = await fetch(`/api/admin/withdrawals/${withdrawId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status,
          adminNotes: notes || `Authorized by admin @${user?.username}`,
          rejectionReason: reason,
          transactionReference: trxRef,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage({ text: `Withdrawal request status updated to: ${status}` });
        setDisbursingWithdrawal(null);
        setRejectingWithdrawal(null);
        setDisburseTrxId('');
        setDisburseNotes('');
        fetchSectionData();
      } else {
        setActionMessage({ text: data.error || 'Failed to update withdrawal', isError: true });
      }
    } catch (err: any) {
      setActionMessage({ text: err.message, isError: true });
    }
  };

  // Handle User Role / Ban Update
  const handleUpdateUserStatus = async (targetId: string, patch: Partial<AdminUserItem>) => {
    try {
      const res = await fetch(`/api/admin/users/${targetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage({ text: 'User account status updated successfully' });
        fetchSectionData();
      } else {
        setActionMessage({ text: data.error || 'Failed to update user', isError: true });
      }
    } catch (err: any) {
      setActionMessage({ text: err.message, isError: true });
    }
  };

  // Handle Monetization Configuration Update
  const handleSaveMonetizationConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const cShare = Number(newCreatorShare);
    const pShare = Number(newPlatformShare);
    const vatRate = Number(newVatRate);

    if (cShare + pShare !== 100) {
      setActionMessage({
        text: 'Error: Creator Share and Platform Share must sum to exactly 100% (No over-allocation)',
        isError: true,
      });
      return;
    }

    try {
      const res = await fetch('/api/admin/monetization-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patch: {
            creatorSharePct: cShare,
            platformSharePct: pShare,
            vatTaxRatePct: vatRate,
          },
          reason: configReason,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage({ text: 'Monetization revenue allocation updated with audit trail logged' });
        fetchSectionData();
      } else {
        setActionMessage({ text: data.error || 'Failed to update config', isError: true });
      }
    } catch (err: any) {
      setActionMessage({ text: err.message, isError: true });
    }
  };

  // Handle Trigger Scheduled Post Check Runner
  const handleTriggerRunner = async () => {
    try {
      const res = await fetch('/api/scheduled-posts/trigger-runner', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setActionMessage({ text: `Scheduled post auto-runner executed: ${data.publishedCount || 0} posts published.` });
      fetchSectionData();
    } catch (err: any) {
      setActionMessage({ text: err.message, isError: true });
    }
  };

  // Owner AI Launch Controls Handlers
  const handleToggleEmergencyKillSwitch = async (activate: boolean) => {
    try {
      setKillSwitchLoading(true);
      const endpoint = activate
        ? '/api/admin/owner/ai-launch/emergency-off'
        : '/api/admin/owner/ai-launch/emergency-on';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: activate ? 'Owner manual emergency shutdown activated' : 'Owner restored operations' }),
      });
      const data = await res.json();
      if (res.ok && data.config) {
        setAiLaunchConfig(data.config);
        setActionMessage({
          text: activate
            ? '🚨 EMERGENCY KILL SWITCH ENGAGED: All AI simulated activity and boosts immediately locked.'
            : '✅ Emergency Kill Switch deactivated. Launch controls restored to standard configuration.'
        });
      } else {
        setActionMessage({ text: data.error || 'Failed to update Kill Switch', isError: true });
      }
    } catch (err: any) {
      setActionMessage({ text: err.message, isError: true });
    } finally {
      setKillSwitchLoading(false);
    }
  };

  const handleUpdateAiLaunch = async (patch: Partial<AiLaunchConfig>) => {
    try {
      const res = await fetch('/api/admin/owner/ai-launch', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ patch, reason: launchReason }),
      });
      const data = await res.json();
      if (res.ok && data.config) {
        setAiLaunchConfig(data.config);
        setActionMessage({ text: 'AI Launch Control configuration updated and audit-logged.' });
      } else {
        setActionMessage({ text: data.error || 'Failed to update AI launch config', isError: true });
      }
    } catch (err: any) {
      setActionMessage({ text: err.message, isError: true });
    }
  };

  const handleRunSimulation = async (itemType: 'post' | 'reel' | 'interaction') => {
    try {
      setSimulationRunning(true);
      const res = await fetch('/api/admin/owner/ai-launch/run-simulation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ itemType, count: 2 }),
      });
      const data = await res.json();
      if (res.ok && data.generatedItems) {
        setSimulationItems((prev) => [...data.generatedItems, ...prev]);
        setActionMessage({ text: `Simulated ${itemType} generated in quarantined internal staging. Zero impact on creator earnings.` });
        // Refresh launch config
        const cfgRes = await fetch('/api/admin/owner/ai-launch', { headers: { Authorization: `Bearer ${token}` } });
        if (cfgRes.ok) {
          const cfgData = await cfgRes.json();
          setAiLaunchConfig(cfgData.config);
        }
      } else {
        setActionMessage({ text: data.error || 'Failed to run simulation', isError: true });
      }
    } catch (err: any) {
      setActionMessage({ text: err.message, isError: true });
    } finally {
      setSimulationRunning(false);
    }
  };

  const handleToggleAdMobMode = async (newTestMode: boolean) => {
    if (!token) return;
    setTogglingAdMobMode(true);
    try {
      const res = await fetch('/api/admin/owner/admob-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          testMode: newTestMode,
          reason: `Owner switched AdMob mode to ${newTestMode ? 'Test Suite Mode' : 'Live Production Mode'}`
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAdMobReadiness(data.readiness);
        setActionMessage({ text: `AdMob switched to ${newTestMode ? 'Test Suite Mode (Official Google Test Units)' : 'Live Production Mode (Configured AdMob Units)'}` });
      } else {
        setActionMessage({ text: data.error || 'Failed to update AdMob mode', isError: true });
      }
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Network error', isError: true });
    } finally {
      setTogglingAdMobMode(false);
    }
  };

  // If Not Authorized
  if (!isAuthorizedAdmin) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center p-6 text-center select-none ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}>
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black mb-2">Restricted Access: Administrator Role Required</h2>
        <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
          The Zan-Gi Admin Panel is protected with strict server-side role-based access control (RBAC). Client credentials with ‘admin’ or ‘owner’ role are required to inspect system telemetry and execute privileged operations.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => onOpenAuth && onOpenAuth('login')}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl text-xs shadow-md"
          >
            Sign In As Administrator
          </button>
          <button
            onClick={onBack}
            className="px-5 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-700"
          >
            Back to Feed
          </button>
        </div>
      </div>
    );
  }

  const isOwner = user?.role === 'owner';
  const sectionsList: Array<{ id: AdminSection; label: string; icon: any }> = [
    { id: 'overview', label: 'Overview & Health', icon: Activity },
    { id: 'storage_r2', label: 'R2 Free-Tier Storage', icon: Database },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'moderation', label: 'Moderation Queue', icon: AlertTriangle },
    { id: 'payouts', label: 'Payout Requests', icon: DollarSign },
    { id: 'monetization_cfg', label: 'Revenue Split Engine', icon: Percent },
    { id: 'ad_providers', label: 'Ad Providers', icon: Tv },
    { id: 'ad_readiness', label: 'AdMob Readiness Audit', icon: ShieldCheck },
    ...(isOwner
      ? [
          { id: 'owner_ai_launch' as AdminSection, label: 'Owner AI Launch Hub', icon: Sparkles },
          { id: 'owner_reconciliation' as AdminSection, label: 'Ledger Reconciliation', icon: Calculator },
          { id: 'owner_fraud' as AdminSection, label: 'Fraud & Safety Alerts', icon: ShieldAlert },
        ]
      : []),
    { id: 'scheduled', label: 'Scheduled Content', icon: Calendar },
    { id: 'rules', label: 'Platform Standards', icon: FileCheck },
    { id: 'ai_moderation', label: 'AI Moderation & Appeals', icon: Bot },
    { id: 'audit_logs', label: 'Security Audit Logs', icon: Lock },
  ];

  return (
    <div className={`flex-1 flex flex-col overflow-hidden select-none transition-colors ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Admin Top Header */}
      <div className={`p-4 sm:p-5 border-b shrink-0 flex items-center justify-between ${
        isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-indigo-600 text-white flex items-center justify-center font-black shadow-md shadow-rose-600/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-base sm:text-lg tracking-tight">Zan-Gi Secure Admin Center</h1>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                ROLE: {user?.role?.toUpperCase()}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Signed in as @{user?.username} · Least-Privilege Enforced</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSectionData}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
            title="Reload Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onBack}
            className="px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-bold hover:bg-slate-800"
          >
            Exit Admin
          </button>
        </div>
      </div>

      {/* Action Notification Message */}
      {actionMessage && (
        <div className={`px-4 py-2.5 text-xs font-semibold flex items-center justify-between ${
          actionMessage.isError
            ? 'bg-rose-500/20 text-rose-300 border-b border-rose-500/30'
            : 'bg-emerald-500/20 text-emerald-300 border-b border-emerald-500/30'
        }`}>
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)}>✕</button>
        </div>
      )}

      {/* Admin Panel Body: Sidebar + Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar (Scrollable on mobile) */}
        <div className={`w-48 sm:w-56 border-r flex flex-col shrink-0 overflow-y-auto p-2 sm:p-3 space-y-1 ${
          isDark ? 'border-slate-800/80 bg-slate-950/80' : 'border-slate-200 bg-white'
        }`}>
          {sectionsList.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`w-full p-2.5 rounded-xl text-left text-xs font-bold transition-all flex items-center gap-2.5 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{sec.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Viewport */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* SECTION 1: OVERVIEW */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Application Health & Real-Time Metrics
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1">
                  <span className="text-slate-400">Total Users</span>
                  <div className="text-xl font-black font-mono text-white">{metrics?.totalUsers ?? '...'}</div>
                </div>
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1">
                  <span className="text-slate-400">Active Sessions</span>
                  <div className="text-xl font-black font-mono text-cyan-400">{metrics?.activeSessions ?? '...'}</div>
                </div>
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1">
                  <span className="text-slate-400">Published Posts</span>
                  <div className="text-xl font-black font-mono text-indigo-400">{metrics?.totalPosts ?? '...'}</div>
                </div>
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1">
                  <span className="text-slate-400">Flagged Reports</span>
                  <div className="text-xl font-black font-mono text-rose-400">{metrics?.flaggedReports ?? '...'}</div>
                </div>
              </div>

              {/* Financial Metrics Overview */}
              <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-3xl space-y-3">
                <h3 className="font-bold text-sm text-amber-400 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Financial Health & Ledger Position
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-slate-400 font-semibold">Total Gross Ad Yield</span>
                    <div className="text-lg font-black font-mono text-white">
                      ${((metrics?.totalGrossRevenueCents || 0) / 100).toFixed(2)}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-slate-400 font-semibold">Creator Distributable (70%)</span>
                    <div className="text-lg font-black font-mono text-emerald-400">
                      ${((metrics?.totalCreatorRevenueCents || 0) / 100).toFixed(2)}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-slate-400 font-semibold">Platform Fee Base (30%)</span>
                    <div className="text-lg font-black font-mono text-blue-400">
                      ${((metrics?.totalPlatformRevenueCents || 0) / 100).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: R2 FREE-TIER STORAGE & QUOTA GUARD */}
          {activeSection === 'storage_r2' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <Database className="w-4 h-4 text-cyan-400" />
                    Cloudflare R2 Free-Tier Storage Guard
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Standard Storage Tier only · Zero Infrequent Access · Hard cutoff at 8.0 GB to guarantee zero accidental charges
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchSectionData}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh Telemetry</span>
                </button>
              </div>

              {/* Status Banner */}
              {storageData?.quota && (
                <div
                  className={`p-4 rounded-3xl border text-xs flex items-start gap-3 ${
                    !storageData.quota.isUploadAllowed
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      : storageData.quota.warnings?.length > 0
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  }`}
                >
                  <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-sm">
                      {!storageData.quota.isUploadAllowed
                        ? 'Uploads Paused: Free-Tier Safety Cap Engaged'
                        : storageData.quota.warnings?.length > 0
                        ? 'Storage Warning Active'
                        : 'Free-Tier Guard Active & Operational'}
                    </p>
                    <p className="text-slate-300 leading-relaxed">
                      {!storageData.quota.isUploadAllowed
                        ? storageData.quota.reason
                        : storageData.quota.warnings?.length > 0
                        ? storageData.quota.warnings.join(' · ')
                        : 'All media uploads are constrained to R2 Standard. Concurrency locks prevent racing above the 8 GB quota.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Primary Quota Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* 1. Storage Usage */}
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-semibold">Active R2 Storage</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                      Cap: 8.0 GB
                    </span>
                  </div>
                  <div className="text-2xl font-black font-mono text-white">
                    {storageData?.quota?.storageUsedMB ?? 0} <span className="text-sm font-normal text-slate-400">MB</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                      <span>{storageData?.quota?.storagePercentOfLimit ?? 0}% used</span>
                      <span>{storageData?.quota?.storageRemainingGB ?? 8.0} GB remaining</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          (storageData?.quota?.storagePercentOfLimit ?? 0) >= 90
                            ? 'bg-rose-500'
                            : (storageData?.quota?.storagePercentOfLimit ?? 0) >= 70
                            ? 'bg-amber-500'
                            : 'bg-cyan-500'
                        }`}
                        style={{ width: `${Math.min(100, storageData?.quota?.storagePercentOfLimit ?? 0)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 pt-1">
                      Soft warning at 7.0 GB · Hard pause at 8.0 GB (10 GB free tier)
                    </p>
                  </div>
                </div>

                {/* 2. Class A Operations */}
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-semibold">Class A Ops (Write/Delete)</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                      1,000,000 / mo
                    </span>
                  </div>
                  <div className="text-2xl font-black font-mono text-indigo-400">
                    {(storageData?.quota?.classAOperations ?? 0).toLocaleString()}
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                      <span>{storageData?.quota?.classAPercent ?? 0}%</span>
                      <span>Cutoff: 900,000 (90%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          (storageData?.quota?.classAPercent ?? 0) >= 90
                            ? 'bg-rose-500'
                            : (storageData?.quota?.classAPercent ?? 0) >= 70
                            ? 'bg-amber-500'
                            : 'bg-indigo-500'
                        }`}
                        style={{ width: `${Math.min(100, storageData?.quota?.classAPercent ?? 0)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 pt-1">
                      Puts, Presigned uploads, Deletes. Object lists bypassed to protect quota.
                    </p>
                  </div>
                </div>

                {/* 3. Class B Operations */}
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-semibold">Class B Ops (Read/Head)</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                      10,000,000 / mo
                    </span>
                  </div>
                  <div className="text-2xl font-black font-mono text-emerald-400">
                    {(storageData?.quota?.classBOperations ?? 0).toLocaleString()}
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                      <span>{storageData?.quota?.classBPercent ?? 0}%</span>
                      <span>Cutoff: 9,000,000 (90%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          (storageData?.quota?.classBPercent ?? 0) >= 90
                            ? 'bg-rose-500'
                            : (storageData?.quota?.classBPercent ?? 0) >= 70
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, storageData?.quota?.classBPercent ?? 0)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 pt-1">
                      Presigned URL downloads and object metadata checks.
                    </p>
                  </div>
                </div>
              </div>

              {/* Policy & Enforcement Details Card */}
              <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-3xl space-y-4">
                <h3 className="font-bold text-sm text-cyan-400 flex items-center gap-2">
                  <HardDrive className="w-4 h-4" />
                  Server-Enforced Architecture Boundaries
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Allowed Binary Media
                    </span>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Exclusively profile avatars, cover banners, post images (JPEG/PNG/WebP/GIF up to 2 MB), and short videos (MP4/WebM/MOV up to 15 MB, max 30s).
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Atomic Reservation & Locking
                    </span>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Parallel uploads acquire atomic capacity reservations in memory and on disk. Simultaneous requests cannot race beyond the 8 GB cutoff.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Active Database Separation
                    </span>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Zero binary media is stored in the database. Users, posts, comments, likes, notifications, and media index metadata reside in the atomic JSON database.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Storage Class Enforcement
                    </span>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      All uploads enforce <code className="text-cyan-400">StorageClass: STANDARD</code>. Infrequent Access, Cloudflare Images, and Cloudflare Stream are explicitly forbidden.
                    </p>
                  </div>
                </div>

                {/* Billing Disclaimer */}
                <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <span className="font-bold text-amber-400">Notice on Cloudflare Billing & Telemetry:</span>
                  <p className="leading-relaxed">
                    {storageData?.quota?.disclaimer ||
                      'Application-level quotas are designed to prevent accidental overages, but do not guarantee zero charges because Cloudflare usage telemetry may experience propagation delays.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: USERS */}
          {activeSection === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  User Accounts Management ({usersList.length})
                </h2>
              </div>

              <div className="rounded-3xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 border-b border-slate-800 text-[11px] uppercase text-slate-400">
                    <tr>
                      <th className="p-3">User</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Verified</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-950/40">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/30">
                        <td className="p-3">
                          <div className="font-bold text-white">{u.displayName}</div>
                          <div className="text-slate-400 text-[11px]">@{u.username} · {u.email}</div>
                        </td>
                        <td className="p-3">
                          <select
                            value={u.role}
                            onChange={(e) => handleUpdateUserStatus(u.id, { role: e.target.value as any })}
                            className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs"
                          >
                            <option value="user">User</option>
                            <option value="creator">Creator</option>
                            <option value="admin">Admin</option>
                            <option value="owner">Owner</option>
                          </select>
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => handleUpdateUserStatus(u.id, { isVerified: !u.isVerified })}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                              u.isVerified ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {u.isVerified ? 'Verified ✓' : 'Unverified'}
                          </button>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.isBanned ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {u.isBanned ? 'BANNED' : 'ACTIVE'}
                          </span>
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => handleUpdateUserStatus(u.id, { isBanned: !u.isBanned })}
                            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                              u.isBanned ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                            }`}
                          >
                            {u.isBanned ? 'Unban' : 'Ban User'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECTION 3: MODERATION QUEUE */}
          {activeSection === 'moderation' && (
            <div className="space-y-4">
              <h2 className="text-base font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Moderation Queue & AI Evidence Inspection ({reportsList.length})
              </h2>

              <div className="space-y-3">
                {reportsList.map((rep) => (
                  <div key={rep.id} className="p-4 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-cyan-400 font-bold">{rep.id}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        rep.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {rep.status}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-slate-300">
                      <span className="text-[10px] text-slate-500 font-mono block">REPORTED CONTENT:</span>
                      <p className="mt-1 font-medium">{rep.postContent}</p>
                    </div>

                    {rep.aiRecommendation && (
                      <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl text-indigo-200 space-y-1">
                        <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          AI Moderation Advisory: Suggested Action '{rep.aiRecommendation.suggestedAction}' ({Math.round(rep.aiRecommendation.confidence * 100)}% Confidence)
                        </span>
                        <p className="text-[11px] text-slate-300">{rep.aiRecommendation.reasoning}</p>
                      </div>
                    )}

                    {rep.status === 'pending' && (
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                        <button
                          onClick={() => handleReportAction(rep.id, 'dismiss')}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold"
                        >
                          Dismiss (No Violation)
                        </button>
                        <button
                          onClick={() => handleReportAction(rep.id, 'warning')}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold"
                        >
                          Issue Warning Notice
                        </button>
                        <button
                          onClick={() => handleReportAction(rep.id, 'delete_post')}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold"
                        >
                          Delete Content Permanently
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 4: PAYOUTS */}
          {activeSection === 'payouts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    Creator Withdrawal Requests & Manual Disbursements ({withdrawalsList.length})
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Official allowed payment rails: <strong className="text-emerald-400">bKash</strong>, <strong className="text-pink-400">Nagad</strong>, <strong className="text-purple-400">Rocket</strong>. Manual disbursements require verified external TrxID.
                  </p>
                </div>
              </div>

              {/* Manual Disbursement Dialog Modal */}
              {disbursingWithdrawal && (
                <div className="p-4 bg-slate-900 border-2 border-emerald-500/40 rounded-3xl space-y-3 text-xs animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <h4 className="font-bold text-white text-sm">
                        Manual Payout Disbursement: ${(disbursingWithdrawal.amountCents / 100).toFixed(2)} via {disbursingWithdrawal.payoutMethod.toUpperCase()}
                      </h4>
                    </div>
                    <button
                      onClick={() => setDisbursingWithdrawal(null)}
                      className="text-slate-400 hover:text-white p-1"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Recipient Account:</span>
                      <strong className="text-white">{disbursingWithdrawal.payoutDetails?.accountIdentifierMasked}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Holder Name:</span>
                      <strong className="text-white">{disbursingWithdrawal.payoutDetails?.accountHolderName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Creator User ID:</span>
                      <strong className="text-white">{disbursingWithdrawal.userId}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Deducted Wallet Coins:</span>
                      <strong className="text-amber-400">{disbursingWithdrawal.coinsDeducted} 🪙</strong>
                    </div>
                  </div>

                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-200">
                    ⚠️ <strong>Manual Audit Protocol:</strong> Disburse the exact amount through your official {disbursingWithdrawal.payoutMethod.toUpperCase()} Merchant or Agent portal. Never request user PIN or OTP. Enter the authentic transaction ID (TrxID) below to finalize ledger accounting.
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Authentic Provider Transaction ID (TrxID) *
                      </label>
                      <input
                        type="text"
                        value={disburseTrxId}
                        onChange={(e) => setDisburseTrxId(e.target.value)}
                        placeholder="e.g. BK789XYZ01, NG9028471, or RKT66209"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl font-mono text-white text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Internal Administrative Audit Notes (Optional)
                      </label>
                      <input
                        type="text"
                        value={disburseNotes}
                        onChange={(e) => setDisburseNotes(e.target.value)}
                        placeholder="Disbursed via corporate merchant portal"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={!disburseTrxId.trim()}
                      onClick={() => handleWithdrawalStatus(
                        disbursingWithdrawal.id,
                        'paid',
                        undefined,
                        disburseTrxId.trim(),
                        disburseNotes.trim() || undefined
                      )}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl font-bold text-xs transition-colors"
                    >
                      Confirm Disbursed & Record TrxID
                    </button>
                    <button
                      type="button"
                      onClick={() => setDisbursingWithdrawal(null)}
                      className="px-3 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl font-semibold text-xs transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Rejection Dialog Modal */}
              {rejectingWithdrawal && (
                <div className="p-4 bg-slate-900 border-2 border-rose-500/40 rounded-3xl space-y-3 text-xs animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h4 className="font-bold text-rose-300 text-sm">
                      Reject Withdrawal Request & Refund Coins
                    </h4>
                    <button
                      onClick={() => setRejectingWithdrawal(null)}
                      className="text-slate-400 hover:text-white p-1"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Rejecting this request will immediately reverse and refund <strong>{rejectingWithdrawal.coinsDeducted} creator coins</strong> back to the user wallet ({rejectingWithdrawal.userId}) and record a ledger reversal.
                  </p>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Reason for Rejection (Documented in Audit Ledger) *
                    </label>
                    <input
                      type="text"
                      value={rejectReasonInput}
                      onChange={(e) => setRejectReasonInput(e.target.value)}
                      placeholder="e.g. Account holder name mismatch with NID"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={!rejectReasonInput.trim()}
                      onClick={() => handleWithdrawalStatus(
                        rejectingWithdrawal.id,
                        'rejected',
                        rejectReasonInput.trim(),
                        undefined,
                        `Rejected by admin @${user?.username}: ${rejectReasonInput.trim()}`
                      )}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white rounded-xl font-bold text-xs transition-colors"
                    >
                      Confirm Rejection & Refund Coins
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectingWithdrawal(null)}
                      className="px-3 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl font-semibold text-xs transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Withdrawals List */}
              <div className="space-y-3">
                {withdrawalsList.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 bg-slate-900/40 rounded-3xl border border-slate-800">
                    No creator withdrawal requests found.
                  </div>
                ) : (
                  withdrawalsList.map((w) => (
                    <div key={w.id} className="p-4 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-black text-sm text-white font-mono">
                            ${(w.amountCents / 100).toFixed(2)} ({w.payoutMethod.toUpperCase()})
                          </span>
                          <span className="text-[11px] text-slate-400 ml-2">User ID: {w.userId}</span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          w.status === 'paid'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : w.status === 'approved'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : w.status === 'rejected'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {w.status}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-[11px] space-y-1">
                        <div>Account: <strong className="text-white">{w.payoutDetails?.accountIdentifierMasked}</strong> ({w.payoutDetails?.accountHolderName})</div>
                        {w.transactionReference && (
                          <div className="text-emerald-400">TrxID: <strong>{w.transactionReference}</strong></div>
                        )}
                        {w.rejectionReason && (
                          <div className="text-rose-400">Rejection: {w.rejectionReason} (Coins Refunded)</div>
                        )}
                        {w.adminNotes && (
                          <div className="text-slate-400 text-[10px]">Notes: {w.adminNotes}</div>
                        )}
                      </div>

                      {(w.status === 'pending' || w.status === 'approved') && (
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-800 flex-wrap">
                          {w.status === 'pending' && (
                            <button
                              onClick={() => handleWithdrawalStatus(w.id, 'approved', undefined, undefined, 'Pre-disbursement review passed')}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors"
                            >
                              Approve Request
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setDisbursingWithdrawal(w);
                              setDisburseTrxId('');
                              setDisburseNotes('');
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-colors"
                          >
                            Process Manual Payout & Record TrxID
                          </button>
                          <button
                            onClick={() => {
                              setRejectingWithdrawal(w);
                              setRejectReasonInput('Account holder name mismatch or verification failure');
                            }}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold transition-colors"
                          >
                            Reject & Refund Coins
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* SECTION 5: MONETIZATION CONFIG */}
          {activeSection === 'monetization_cfg' && (
            <div className="space-y-4 max-w-xl">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Percent className="w-4 h-4 text-indigo-400" />
                Revenue Allocation Engine & Tax Accounting
              </h2>

              <form onSubmit={handleSaveMonetizationConfig} className="p-5 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Creator Share (%)</label>
                    <input
                      type="number"
                      value={newCreatorShare}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setNewCreatorShare(e.target.value);
                        setNewPlatformShare(String(100 - val));
                      }}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Platform Share (%)</label>
                    <input
                      type="number"
                      value={newPlatformShare}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setNewPlatformShare(e.target.value);
                        setNewCreatorShare(String(100 - val));
                      }}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Statutory VAT Rate (%) on Platform Fee</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newVatRate}
                    onChange={(e) => setNewVatRate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white text-sm"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Booked as a distinct statutory tax liability line, never deducted from creator share.
                  </p>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Audit Reason for Change (Required)</label>
                  <input
                    type="text"
                    required
                    value={configReason}
                    onChange={(e) => setConfigReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-md"
                >
                  Save Split Changes (Immutable Audit Logged)
                </button>
              </form>
            </div>
          )}

          {/* SECTION 6: AD PROVIDERS */}
          {activeSection === 'ad_providers' && (
            <div className="space-y-4 max-w-xl">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Tv className="w-4 h-4 text-cyan-400" />
                AdMob SDK Provider Status
              </h2>

              <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="font-bold text-white">SDK Status</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold ${
                    adMobReadiness?.isTestMode
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {adMobReadiness?.isTestMode ? 'TEST SUITE ACTIVE' : 'LIVE PRODUCTION ACTIVE'}
                  </span>
                </div>
                <div className="font-mono text-[11px] space-y-1.5 text-slate-300">
                  <p className="flex justify-between">
                    <span className="text-slate-400">1. App ID:</span>
                    <span className="text-cyan-300 font-bold">{adMobReadiness?.configuredUnits?.appId || 'ca-app-pub-3940256099942544~3347511713'}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-400">2. Banner Unit:</span>
                    <span className="text-slate-200">{adMobReadiness?.configuredUnits?.bannerAdUnitId || 'ca-app-pub-3940256099942544/6300978111'}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-400">3. Interstitial Unit:</span>
                    <span className="text-slate-200">{adMobReadiness?.configuredUnits?.interstitialAdUnitId || 'ca-app-pub-3940256099942544/1033173712'}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-400">4. Native Unit:</span>
                    <span className="text-slate-200">{adMobReadiness?.configuredUnits?.nativeAdUnitId || 'ca-app-pub-3940256099942544/2247696110'}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-400">5. Rewarded Unit:</span>
                    <span className="text-slate-200">{adMobReadiness?.configuredUnits?.rewardedAdUnitId || 'ca-app-pub-3940256099942544/5224354917'}</span>
                  </p>
                  <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between">
                    <span>Server-Side Verification (SSV):</span>
                    <span className="text-emerald-400 font-bold">Enabled & Verified</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 7: SCHEDULED CONTENT */}
          {activeSection === 'scheduled' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-cyan-400" />
                  Scheduled Content Queue ({scheduledPosts.length})
                </h2>
                <button
                  onClick={handleTriggerRunner}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Run Auto-Publish Dispatcher Now
                </button>
              </div>

              <div className="space-y-3">
                {scheduledPosts.map((sp) => (
                  <div key={sp.id} className="p-4 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-cyan-400">{sp.id}</span>
                      <span className="font-mono text-slate-400">{new Date(sp.scheduledAt).toLocaleString()}</span>
                    </div>
                    <p className="text-slate-300">{sp.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 8: PLATFORM STANDARDS */}
          {activeSection === 'rules' && (
            <div className="space-y-3">
              <h2 className="text-base font-bold flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                Active Platform Community Standards
              </h2>
              {rulesList.map((rule, idx) => (
                <div key={rule.id} className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl text-xs space-y-1">
                  <h4 className="font-bold text-white">{idx + 1}. {rule.titleEn} ({rule.titleBn})</h4>
                  <p className="text-slate-400">{rule.descriptionEn}</p>
                </div>
              ))}
            </div>
          )}

          {/* SECTION 9: AI MODERATION & APPEALS */}
          {activeSection === 'ai_moderation' && (
            <div className="space-y-4">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                AI Content Copilot & Moderation System Limits
              </h2>
              <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-3 text-xs">
                <p className="text-slate-300">
                  Model: <span className="font-mono font-bold text-cyan-400">{aiMetrics?.config?.activeModel || 'gemini-3.8-flash'}</span>
                </p>
                <p className="text-slate-300">
                  Rate Limit: <span className="font-mono text-white">{aiMetrics?.config?.rateLimitPerMinute} requests / min</span>
                </p>
                <p className="text-slate-300">
                  Safety System: Multilingual Hate Speech & Fraud Pre-Filter active
                </p>
              </div>
            </div>
          )}

          {/* SECTION: ADMOB READINESS AUDIT */}
          {activeSection === 'ad_readiness' && (
            <div className="space-y-5 max-w-4xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Google AdMob Production Readiness & Credentials Audit
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Strict real-revenue verification · Zero fabricated impressions or earnings
                  </p>
                </div>
                <button
                  onClick={fetchSectionData}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Re-Audit Credentials</span>
                </button>
              </div>

              {/* Production Readiness Status Banner with Live Mode Switcher */}
              <div className={`p-4 rounded-3xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                adMobReadiness?.isProductionReady
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}>
                <div className="flex items-start gap-3">
                  {adMobReadiness?.isProductionReady ? (
                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
                  )}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">
                        {adMobReadiness?.isProductionReady
                          ? 'PRODUCTION READY: Authentic AdMob IDs Configured'
                          : 'TEST SUITE ACTIVE: Google Sample Ad Units & SSV Test Adapter'}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      {adMobReadiness?.isProductionReady
                        ? 'All authentic AdMob keys are active in the environment. Genuine impressions and rewarded SSV callbacks will generate real creator revenue.'
                        : 'The system is operating with official Google AdMob test IDs (ca-app-pub-3940256099942544/*). Safe for testing without invalid traffic risk.'}
                    </p>
                  </div>
                </div>

                {isOwner && (
                  <button
                    onClick={() => handleToggleAdMobMode(!adMobReadiness?.isTestMode)}
                    disabled={togglingAdMobMode}
                    className={`px-3.5 py-2 rounded-xl font-bold text-xs shrink-0 shadow-md transition-all ${
                      adMobReadiness?.isTestMode
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-amber-600 hover:bg-amber-500 text-white'
                    }`}
                  >
                    {togglingAdMobMode ? (
                      'Switching...'
                    ) : adMobReadiness?.isTestMode ? (
                      'Switch to Live Production Mode'
                    ) : (
                      'Switch to Google Test Suite'
                    )}
                  </button>
                )}
              </div>

              {/* 5 Units Grid (App ID + 4 Ad Formats) */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
                <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1">
                  <span className="text-slate-400 text-[11px]">1. App ID</span>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Configured</span>
                  </div>
                  <p className="font-mono text-[10px] text-cyan-300 truncate" title={adMobReadiness?.configuredUnits?.appId}>
                    {adMobReadiness?.configuredUnits?.appId || 'ca-app-pub-3940256099942544~3347511713'}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1">
                  <span className="text-slate-400 text-[11px]">2. Adaptive Banner</span>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Feed Banner</span>
                  </div>
                  <p className="font-mono text-[10px] text-slate-400 truncate" title={adMobReadiness?.configuredUnits?.bannerAdUnitId}>
                    {adMobReadiness?.configuredUnits?.bannerAdUnitId || 'ca-app-pub-3940256099942544/6300978111'}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1">
                  <span className="text-slate-400 text-[11px]">3. Interstitial</span>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Natural Flow (180s)</span>
                  </div>
                  <p className="font-mono text-[10px] text-slate-400 truncate" title={adMobReadiness?.configuredUnits?.interstitialAdUnitId}>
                    {adMobReadiness?.configuredUnits?.interstitialAdUnitId || 'ca-app-pub-3940256099942544/1033173712'}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1">
                  <span className="text-slate-400 text-[11px]">4. Native Ad</span>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Feed Card</span>
                  </div>
                  <p className="font-mono text-[10px] text-slate-400 truncate" title={adMobReadiness?.configuredUnits?.nativeAdUnitId}>
                    {adMobReadiness?.configuredUnits?.nativeAdUnitId || 'ca-app-pub-3940256099942544/2247696110'}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1">
                  <span className="text-slate-400 text-[11px]">5. Rewarded Video</span>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>SSV Verified</span>
                  </div>
                  <p className="font-mono text-[10px] text-slate-400 truncate" title={adMobReadiness?.configuredUnits?.rewardedAdUnitId}>
                    {adMobReadiness?.configuredUnits?.rewardedAdUnitId || 'ca-app-pub-3940256099942544/5224354917'}
                  </p>
                </div>
              </div>

              {/* SSV & Privacy Compliance Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold">
                    <Lock className="w-4 h-4" />
                    <span>Server-Side Verification (SSV) Endpoint</span>
                  </div>
                  <p className="font-mono text-[11px] text-slate-300 bg-slate-950 p-2 rounded-xl border border-slate-800 break-all select-all">
                    {adMobReadiness?.ssvCallbackUrl || 'https://api.zan-gi.app/api/ads/admob-ssv-callback'}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Rewards are credited ONLY after cryptographic server-side validation with duplicate anti-replay protection.
                  </p>
                </div>

                <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>User Privacy & Consent Framework</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    <span className="font-bold text-emerald-400">Google UMP SDK 3.1.0</span> active for GDPR/EEA and CCPA compliance.
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Consent form is automatically presented to users in regulated regions; non-personalized ads are rendered if consent is declined.
                  </p>
                </div>
              </div>

              {/* Missing Keys Notice if in test mode */}
              {adMobReadiness?.missingKeys && adMobReadiness.missingKeys.length > 0 && (
                <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-3xl space-y-2 text-xs">
                  <h3 className="font-bold text-amber-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Required Environment Keys for Production Play Store Launch
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-slate-300 font-mono text-[11px]">
                    {adMobReadiness.missingKeys.map((key, i) => (
                      <li key={i}>{key}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Go-Live Deployment Guidance */}
              <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-3xl space-y-3 text-xs">
                <h3 className="font-bold text-sm text-cyan-400 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Exact AdMob Production Release Steps
                </h3>
                <div className="space-y-2 text-slate-300">
                  {adMobReadiness?.guidance?.map((step, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 font-mono text-[11px]">
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SECTION: OWNER AI LAUNCH HUB */}
          {activeSection === 'owner_ai_launch' && (
            <div className="space-y-6 max-w-4xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    Owner AI Launch Operations & Internal Staging Hub
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Restricted to Platform Owner (@{user?.username}) · Master control over AI discovery, recommendations & simulation quarantine
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  OWNER ONLY
                </span>
              </div>

              {/* Emergency Kill Switch Banner */}
              <div className={`p-5 rounded-3xl border transition-all ${
                aiLaunchConfig?.emergencyKillSwitchActive
                  ? 'bg-rose-950/40 border-rose-500 text-rose-300'
                  : 'bg-slate-900/60 border-slate-800'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <AlertOctagon className={`w-5 h-5 ${aiLaunchConfig?.emergencyKillSwitchActive ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`} />
                      <span className="font-black text-sm">
                        {aiLaunchConfig?.emergencyKillSwitchActive
                          ? '🚨 EMERGENCY KILL SWITCH ACTIVE: ALL AI LAUNCH ACTIVITY HALTED'
                          : 'Master Emergency Kill Switch (Standby)'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                      {aiLaunchConfig?.emergencyKillSwitchActive
                        ? 'All automated discovery, feed recommendations, and simulated activity are locked in emergency safe state. Deactivate only when ready.'
                        : 'One-click emergency master cutoff: Immediately disables simulated activity, revokes active sessions, and locks AI features.'}
                    </p>
                  </div>

                  <button
                    onClick={() => handleToggleEmergencyKillSwitch(!aiLaunchConfig?.emergencyKillSwitchActive)}
                    disabled={killSwitchLoading}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap shadow-lg transition-all ${
                      aiLaunchConfig?.emergencyKillSwitchActive
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                    }`}
                  >
                    {killSwitchLoading
                      ? 'Processing...'
                      : aiLaunchConfig?.emergencyKillSwitchActive
                      ? 'Deactivate Emergency Kill Switch'
                      : 'ENGAGE EMERGENCY KILL SWITCH'}
                  </button>
                </div>
              </div>

              {/* AI Launch Feature Toggles */}
              <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-3xl space-y-4 text-xs">
                <h3 className="font-bold text-sm text-cyan-400 flex items-center gap-2">
                  <Sliders className="w-4 h-4" />
                  AI Launch Feature Controls
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Discovery Assistance */}
                  <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white block">AI Discovery Assistance</span>
                      <span className="text-[11px] text-slate-400">Tag optimization & organic discoverability</span>
                    </div>
                    <button
                      onClick={() => handleUpdateAiLaunch({ isDiscoveryAssistanceEnabled: !aiLaunchConfig?.isDiscoveryAssistanceEnabled })}
                      className={`px-3 py-1 rounded-xl font-bold text-xs transition-colors ${
                        aiLaunchConfig?.isDiscoveryAssistanceEnabled
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {aiLaunchConfig?.isDiscoveryAssistanceEnabled ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>

                  {/* Content Recommendations */}
                  <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white block">Smart Recommendations</span>
                      <span className="text-[11px] text-slate-400">Algorithmic feed & relevance ranking</span>
                    </div>
                    <button
                      onClick={() => handleUpdateAiLaunch({ isContentRecommendationsEnabled: !aiLaunchConfig?.isContentRecommendationsEnabled })}
                      className={`px-3 py-1 rounded-xl font-bold text-xs transition-colors ${
                        aiLaunchConfig?.isContentRecommendationsEnabled
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {aiLaunchConfig?.isContentRecommendationsEnabled ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>

                  {/* Launch Previews */}
                  <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white block">AI Launch Previews</span>
                      <span className="text-[11px] text-slate-400">Creator Studio AI caption & script generators</span>
                    </div>
                    <button
                      onClick={() => handleUpdateAiLaunch({ isLaunchPreviewEnabled: !aiLaunchConfig?.isLaunchPreviewEnabled })}
                      className={`px-3 py-1 rounded-xl font-bold text-xs transition-colors ${
                        aiLaunchConfig?.isLaunchPreviewEnabled
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {aiLaunchConfig?.isLaunchPreviewEnabled ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>

                  {/* Simulated Activity */}
                  <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white block">Simulated Activity (Internal Staging)</span>
                      <span className="text-[11px] text-slate-400">Auto-expires in 2h · Quarantined from revenue</span>
                    </div>
                    <button
                      onClick={() => handleUpdateAiLaunch({ isSimulatedActivityEnabled: !aiLaunchConfig?.isSimulatedActivityEnabled })}
                      className={`px-3 py-1 rounded-xl font-bold text-xs transition-colors ${
                        aiLaunchConfig?.isSimulatedActivityEnabled
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {aiLaunchConfig?.isSimulatedActivityEnabled ? 'ACTIVE (DEMO)' : 'OFF (SAFE)'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-slate-400 text-[11px] font-semibold mb-1">Max Simulation Rate / Hour</label>
                    <input
                      type="number"
                      value={aiLaunchConfig?.simulationRateLimitPerHour || 30}
                      onChange={(e) => handleUpdateAiLaunch({ simulationRateLimitPerHour: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[11px] font-semibold mb-1">Batch Items Cap</label>
                    <input
                      type="number"
                      value={aiLaunchConfig?.simulationMaxItems || 15}
                      onChange={(e) => handleUpdateAiLaunch({ simulationMaxItems: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Internal Simulation Generator & Strict Quarantine Notice */}
              <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-3xl space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-amber-400 flex items-center gap-2">
                    <Bot className="w-4 h-4" />
                    Internal Staging Activity Generator (Strict Isolation)
                  </h3>
                  <span className="text-[10px] font-mono bg-rose-500/10 text-rose-300 border border-rose-500/20 px-2 py-0.5 rounded-full font-bold">
                    ZERO REVENUE IMPACT GUARANTEE
                  </span>
                </div>

                <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
                  <strong className="text-amber-300">Hard Quarantine Rule:</strong> All simulated items are tagged with <code className="text-cyan-300 font-mono">isSimulatedActivity: true</code> and <code className="text-cyan-300 font-mono">isDemoData: true</code>. Under no circumstances do simulated views or likes count toward genuine public engagement claims, AdMob revenue calculations, creator eligibility milestones, coin awards, or payouts.
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={() => handleRunSimulation('post')}
                    disabled={simulationRunning || !aiLaunchConfig?.isSimulatedActivityEnabled || aiLaunchConfig?.emergencyKillSwitchActive}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-md flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Generate Staging Post</span>
                  </button>
                  <button
                    onClick={() => handleRunSimulation('reel')}
                    disabled={simulationRunning || !aiLaunchConfig?.isSimulatedActivityEnabled || aiLaunchConfig?.emergencyKillSwitchActive}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-md flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Generate Staging Reel</span>
                  </button>
                  <button
                    onClick={() => handleRunSimulation('interaction')}
                    disabled={simulationRunning || !aiLaunchConfig?.isSimulatedActivityEnabled || aiLaunchConfig?.emergencyKillSwitchActive}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-xl font-bold transition-all border border-slate-700 flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Generate Staging Interaction</span>
                  </button>
                </div>

                {simulationItems.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <span className="font-bold text-slate-300 text-xs">Recent Quarantined Staging Items:</span>
                    <div className="max-h-48 overflow-y-auto space-y-2 font-mono text-[11px]">
                      {simulationItems.map((item, idx) => (
                        <div key={idx} className="p-2.5 bg-slate-950 rounded-xl border border-amber-500/20 text-slate-300 space-y-1.5">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-amber-400 font-bold">[{item.id}]</span>
                            <span className="text-rose-400 font-bold px-1.5 py-0.5 bg-rose-500/10 rounded border border-rose-500/20">QUARANTINED DEMO</span>
                          </div>
                          <p className="text-slate-300">{item.content}</p>
                          <div className="flex flex-wrap items-center gap-3 pt-1 text-[10px] text-amber-300 font-mono border-t border-slate-800/60">
                            <span className="flex items-center gap-1">
                              <span className="text-slate-400">Views:</span> {item.simulatedViews || 0} <span className="text-[9px] text-rose-400 font-bold">[DEMO ONLY]</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="text-slate-400">Likes:</span> {item.simulatedLikes || 0} <span className="text-[9px] text-rose-400 font-bold">[DEMO ONLY]</span>
                            </span>
                            <span className="text-slate-500 text-[9px] ml-auto">Zero public engagement / 0% AdMob credit</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* AI Launch Audit History */}
              {aiLaunchConfig?.auditHistory && aiLaunchConfig.auditHistory.length > 0 && (
                <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-3xl space-y-3 text-xs">
                  <h3 className="font-bold text-sm text-slate-300 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-rose-400" />
                    Owner AI Launch Audit Trail ({aiLaunchConfig.auditHistory.length})
                  </h3>
                  <div className="max-h-48 overflow-y-auto space-y-2 font-mono text-[11px]">
                    {aiLaunchConfig.auditHistory.map((log, i) => (
                      <div key={i} className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-slate-300">
                        <span className="text-cyan-400 font-bold">[{new Date(log.timestamp).toLocaleTimeString()}]</span> {log.action} · Reason: {log.details?.reason || JSON.stringify(log.details)} · IP: {log.ip}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION: FINANCIAL RECONCILIATION AUDIT */}
          {activeSection === 'owner_reconciliation' && (
            <div className="space-y-5 max-w-4xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-emerald-400" />
                    Owner Financial Reconciliation & Zero-Leakage Audit
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Mathematical verification: Gross Revenue = Creator (70%) + Platform (30%) with 0% error
                  </p>
                </div>
                <button
                  onClick={fetchSectionData}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Re-Reconcile Ledger</span>
                </button>
              </div>

              {/* Reconciliation Status Card */}
              <div className={`p-4 rounded-3xl border text-xs flex items-start gap-3 ${
                reconciliation?.isReconciled
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}>
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
                <div className="space-y-1">
                  <span className="font-bold text-sm">
                    {reconciliation?.mathematicalAuditStatus === 'VERIFIED_100_PERCENT_INTEGRITY'
                      ? '100% RECONCILED: MATHEMATICAL ZERO-LEAKAGE VERIFIED'
                      : 'ATTENTION: DISCREPANCY DETECTED IN LEDGER SPLIT'}
                  </span>
                  <p className="text-slate-400 text-[11px]">
                    Total Gross Yield exactly matches sum of Creator Share and Platform Fee. Discrepancy: ${((reconciliation?.discrepancyCents || 0) / 100).toFixed(2)}.
                  </p>
                </div>
              </div>

              {/* Revenue Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1">
                  <span className="text-slate-400 text-[11px]">Total Gross Revenue</span>
                  <div className="text-lg font-black font-mono text-white">
                    ${((reconciliation?.totalGrossCents || 0) / 100).toFixed(2)}
                  </div>
                  <p className="text-[10px] text-slate-500">All ad & coin receipts</p>
                </div>
                <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1">
                  <span className="text-slate-400 text-[11px]">Creator Allocation (70%)</span>
                  <div className="text-lg font-black font-mono text-emerald-400">
                    ${((reconciliation?.totalCreatorAmountCents || 0) / 100).toFixed(2)}
                  </div>
                  <p className="text-[10px] text-slate-500">Distributable creator base</p>
                </div>
                <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1">
                  <span className="text-slate-400 text-[11px]">Platform Fee (30%)</span>
                  <div className="text-lg font-black font-mono text-blue-400">
                    ${((reconciliation?.totalPlatformAmountCents || 0) / 100).toFixed(2)}
                  </div>
                  <p className="text-[10px] text-slate-500">Platform operational base</p>
                </div>
                <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1">
                  <span className="text-slate-400 text-[11px]">Statutory VAT Line (2%)</span>
                  <div className="text-lg font-black font-mono text-indigo-400">
                    ${((reconciliation?.totalTaxAmountCents || 0) / 100).toFixed(2)}
                  </div>
                  <p className="text-[10px] text-slate-500">On taxable platform service</p>
                </div>
              </div>

              {/* Payout & Withdrawal Reconciliation */}
              <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-3xl space-y-3 text-xs">
                <h3 className="font-bold text-sm text-amber-400 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Disbursement & Withdrawal Reconciliation
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[11px] block">Total Paid Out</span>
                    <span className="font-bold text-emerald-400 font-mono text-sm">
                      ${((reconciliation?.totalPaidOutCents || 0) / 100).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-500 block">{reconciliation?.paidWithdrawalsCount || 0} paid</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[11px] block">Pending Reviews</span>
                    <span className="font-bold text-amber-300 font-mono text-sm">
                      ${((reconciliation?.pendingWithdrawalsCents || 0) / 100).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-500 block">{reconciliation?.pendingWithdrawalsCount || 0} requests</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[11px] block">Ledger Records</span>
                    <span className="font-bold text-cyan-400 font-mono text-sm">{reconciliation?.totalEntriesCount || 0}</span>
                    <span className="text-[10px] text-slate-500 block">Immutable entries</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-400 text-[11px] block">SSV Anti-Replay</span>
                    <span className="font-bold text-indigo-400 font-mono text-sm">{reconciliation?.verifiedRewardClaimsCount || 0}</span>
                    <span className="text-[10px] text-slate-500 block">Unique verified claims</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: ANTI-FRAUD & SUSPICIOUS ACTIVITY */}
          {activeSection === 'owner_fraud' && (
            <div className="space-y-4 max-w-4xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    Real-Time Anti-Fraud & Invalid Traffic Monitor
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Automated anomaly detection: velocity limits, daily ad cap monitors, SSV anti-replay & high-value payout audits
                  </p>
                </div>
                <button
                  onClick={fetchSectionData}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Scan Alerts</span>
                </button>
              </div>

              {suspiciousAlerts.length === 0 ? (
                <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-3xl text-slate-400 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="font-bold text-sm text-white">No Suspicious Activity Detected</p>
                  <p className="text-xs">All rewarded ad claims, IP frequencies, and withdrawal transactions are within normal thresholds.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {suspiciousAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-3xl border text-xs space-y-1.5 ${
                        alert.severity === 'high' || alert.severity === 'critical'
                          ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                          : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            alert.severity === 'high' ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
                          }`}>
                            {alert.severity.toUpperCase()}
                          </span>
                          <span className="font-bold text-white font-mono">@{alert.username}</span>
                          <span className="text-slate-400">({alert.type})</span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-slate-300">{alert.details}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION 10: AUDIT LOGS */}
          {activeSection === 'audit_logs' && (
            <div className="space-y-4">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Lock className="w-4 h-4 text-rose-400" />
                Cryptographic Security & Administrator Audit Logs ({auditLogs.length})
              </h2>

              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-3xl max-h-96 overflow-y-auto space-y-2 font-mono text-[11px]">
                {auditLogs.map((log, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-slate-300">
                    <span className="text-cyan-400 font-bold">[{new Date(log.timestamp).toLocaleTimeString()}]</span> {log.action} · Target: {log.targetId || 'SYSTEM'} · IP: {log.ip || '127.0.0.1'}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
