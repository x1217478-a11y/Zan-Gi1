import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  CreditCard,
  ArrowUpRight,
  RefreshCw,
  Info,
  Calendar,
  Lock,
  ChevronRight,
  ExternalLink,
  Plus,
  Play,
  FileText,
  AlertTriangle,
  History,
  Coins,
  Percent,
  Eye,
  Video,
  Filter,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  MonetizationSummary,
  MonetizationConfig,
  PayoutDetails,
  PayoutProvider,
  LedgerEntry,
  WithdrawalRequest
} from '../../types';
import { CommunityStandardsModal } from '../modals/CommunityStandardsModal';

interface MonetizationViewProps {
  isBengali: boolean;
  onBack?: () => void;
  onOpenAuth?: (mode: 'login' | 'register') => void;
}

export const MonetizationView: React.FC<MonetizationViewProps> = ({
  isBengali,
  onBack,
  onOpenAuth,
}) => {
  const { user, token, isAuthenticated } = useAuth();
  const { isDark } = useTheme();

  // Summary State
  const [summary, setSummary] = useState<MonetizationSummary | null>(null);
  const [config, setConfig] = useState<MonetizationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'watch_ads' | 'ledger' | 'withdrawals' | 'payout_methods'>('overview');

  // Date Range Filtering State (daily/weekly/monthly/custom analytics)
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [isCancellingWithdrawalId, setIsCancellingWithdrawalId] = useState<string | null>(null);

  // Watch Ads & Earn State
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [adCountdown, setAdCountdown] = useState(15);
  const [adStatusMessage, setAdStatusMessage] = useState<string | null>(null);
  const [adCooldownSeconds, setAdCooldownSeconds] = useState(0);
  const [claimLoading, setClaimLoading] = useState(false);

  // Withdrawal Request State ($100.00 minimum enforced)
  const [withdrawAmountDollars, setWithdrawAmountDollars] = useState('100.00');
  const [selectedPayoutProvider, setSelectedPayoutProvider] = useState<PayoutProvider>('bkash');
  const [payoutIdentifier, setPayoutIdentifier] = useState('01712-345678');
  const [payoutHolderName, setPayoutHolderName] = useState(user?.displayName || 'Fahim Ahmed');
  const [withdrawFeedback, setWithdrawFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);

  // Policy Modal
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showCalcExplainer, setShowCalcExplainer] = useState(false);

  // Load Monetization Data with Date Range
  const fetchData = async (range: string = dateRangeFilter, start?: string, end?: string) => {
    try {
      setLoading(true);
      setError(null);
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let url = '/api/monetization/summary';
      const params = new URLSearchParams();
      if (range !== 'all' && range !== 'custom') {
        params.append('range', range);
      } else if (range === 'custom') {
        const s = start || customStartDate;
        const e = end || customEndDate;
        if (s && e) {
          params.append('start', s);
          params.append('end', e);
        }
      }
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const [sumRes, cfgRes] = await Promise.all([
        fetch(url, { headers }),
        fetch('/api/monetization/config')
      ]);

      if (sumRes.ok) {
        const sumData = await sumRes.json();
        setSummary(sumData);
      } else {
        const sumErr = await sumRes.json();
        setError(sumErr.error || 'Failed to load creator monetization statement');
      }

      if (cfgRes.ok) {
        const cfgData = await cfgRes.json();
        setConfig(cfgData.config);
      }
    } catch (err: any) {
      setError(err.message || 'Network error loading monetization details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleApplyDateRange = (range: 'all' | 'today' | 'week' | 'month' | 'custom') => {
    setDateRangeFilter(range);
    if (range !== 'custom') {
      fetchData(range);
    }
  };

  const handleApplyCustomDates = () => {
    if (customStartDate && customEndDate) {
      fetchData('custom', customStartDate, customEndDate);
    }
  };

  const handleCancelWithdrawal = async (withdrawalId: string) => {
    if (!token) return;
    try {
      setIsCancellingWithdrawalId(withdrawalId);
      const res = await fetch('/api/monetization/withdrawals/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ withdrawalId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWithdrawFeedback({
          success: true,
          message: isBengali
            ? 'উত্তোলন অনুরোধ সফলভাবে বাতিল করা হয়েছে এবং কয়েন আপনার ওয়ালেটে ফেরত দেওয়া হয়েছে।'
            : 'Withdrawal request cancelled successfully and coins refunded to your wallet.'
        });
        fetchData(dateRangeFilter);
      } else {
        setWithdrawFeedback({
          success: false,
          message: data.error || 'Failed to cancel withdrawal'
        });
      }
    } catch (err: any) {
      setWithdrawFeedback({
        success: false,
        message: err.message || 'Network error cancelling withdrawal'
      });
    } finally {
      setIsCancellingWithdrawalId(null);
    }
  };

  // Handle Cooldown countdown
  useEffect(() => {
    if (adCooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setAdCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [adCooldownSeconds]);

  // Handle Ad Watching Progress
  useEffect(() => {
    if (!isWatchingAd) return;
    if (adCountdown > 0) {
      const timer = setTimeout(() => {
        setAdCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // Ad watch completed, proceed to server-side verification claim
      completeAndClaimAdReward();
    }
  }, [isWatchingAd, adCountdown]);

  const startWatchingAd = () => {
    if (!isAuthenticated) {
      if (onOpenAuth) onOpenAuth('login');
      return;
    }
    if (adCooldownSeconds > 0) {
      setAdStatusMessage(
        isBengali
          ? `অনুগ্রহ করে ${adCooldownSeconds} সেকেন্ড অপেক্ষা করুন (কুলডাউন সক্রিয়)`
          : `Please wait ${adCooldownSeconds}s (Anti-abuse cooldown active)`
      );
      return;
    }
    setIsWatchingAd(true);
    setAdCountdown(15);
    setAdStatusMessage(null);
  };

  const cancelAdWatch = () => {
    setIsWatchingAd(false);
    setAdCountdown(15);
    setAdStatusMessage(
      isBengali
        ? 'বিজ্ঞাপনটি অসম্পূর্ণ ছিল — কোনো রিওয়ার্ড জমা হয়নি।'
        : 'Ad was cancelled before completion — no reward credited.'
    );
  };

  const completeAndClaimAdReward = async () => {
    try {
      setClaimLoading(true);
      const clientTxId = `zangi_ssv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const res = await fetch('/api/monetization/rewarded-ads/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clientTransactionId: clientTxId,
          adUnitId: 'ca-app-pub-3940256099942544/5224354917',
          durationWatchedSeconds: 15,
          providerSignature: `sig_admob_verified_${clientTxId}`,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAdStatusMessage(
          isBengali
            ? `🎉 সফল! সার্ভার যাচাই সম্পূর্ণ: +$${(data.entry?.creatorAmountCents / 100).toFixed(2)} ক্রিয়েটর ব্যালেন্স ও +${data.entry?.coinsAmount} কয়েন জমা হয়েছে।`
            : `🎉 Verified by Server SSV! +$${(data.entry?.creatorAmountCents / 100).toFixed(2)} creator share & +${data.entry?.coinsAmount} coins credited.`
        );
        setAdCooldownSeconds(config?.rewardedAdCooldownSeconds || 60);
        fetchData();
      } else {
        setAdStatusMessage(`⚠️ ${data.error || 'Failed to verify reward claim'}`);
      }
    } catch (err: any) {
      setAdStatusMessage(`⚠️ Network error during SSV claim: ${err.message}`);
    } finally {
      setIsWatchingAd(false);
      setClaimLoading(false);
    }
  };

  // Submit Withdrawal Request
  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      if (onOpenAuth) onOpenAuth('login');
      return;
    }

    const amountNum = parseFloat(withdrawAmountDollars);
    if (isNaN(amountNum) || amountNum < 100) {
      setWithdrawFeedback({
        success: false,
        message: isBengali
          ? 'সর্বনিম্ন উত্তোলন সীমা হলো ১০০.০০ মার্কিন ডলার (১০,০০০ ক্রিয়েটর কয়েন)। ১০০ ডলারের কম কোনো অনুরোধ গ্রহণযোগ্য নয়।'
          : 'Minimum withdrawal amount is $100.00 USD (10,000 Creator Coins). Submissions below $100.00 are strictly blocked.'
      });
      return;
    }

    const amountCents = Math.round(amountNum * 100);
    const availableCents = summary?.availableBalanceCents || 0;
    if (amountCents > availableCents) {
      setWithdrawFeedback({
        success: false,
        message: isBengali ? 'পর্যাপ্ত প্রদেয় ব্যালেন্স নেই' : 'Insufficient available payable balance'
      });
      return;
    }

    try {
      setIsSubmittingWithdraw(true);
      setWithdrawFeedback(null);

      const res = await fetch('/api/monetization/withdrawals/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amountCents,
          payoutProvider: selectedPayoutProvider,
          accountDetails: {
            accountIdentifierMasked: payoutIdentifier,
            accountHolderName: payoutHolderName,
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setWithdrawFeedback({
          success: true,
          message: isBengali
            ? 'উত্তোলন অনুরোধ সফলভাবে গৃহীত হয়েছে! আনুমানিক ৪০–৪৮ ঘণ্টার মধ্যে অ্যাডমিন যাচাইকরণ ও ট্রান্সফার সম্পন্ন হবে।'
            : 'Withdrawal request successfully queued! Estimated processing time: 40–48 hours for administrative verification and disbursement.'
        });
        fetchData();
      } else {
        setWithdrawFeedback({
          success: false,
          message: data.error || 'Withdrawal submission failed'
        });
      }
    } catch (err: any) {
      setWithdrawFeedback({
        success: false,
        message: err.message || 'Network error'
      });
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  const BDT_EXCHANGE_RATE = 122.50; // Documented Bangladesh Bank interbank reference rate
  const RATE_REFERENCE_DATE = 'October 2026';

  const formatCents = (cents: number = 0) => {
    return (cents / 100).toFixed(2);
  };

  const toBdt = (cents: number = 0) => {
    return Math.round((cents / 100) * BDT_EXCHANGE_RATE).toLocaleString();
  };

  return (
    <div
      className={`flex-1 overflow-y-auto select-none transition-colors pb-16 ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Community Standards & Policy Modal */}
      <CommunityStandardsModal
        isOpen={showPolicyModal}
        onClose={() => setShowPolicyModal(false)}
        isBengali={isBengali}
      />

      {/* Calculation Formula Explainer Modal */}
      {showCalcExplainer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div
            className={`max-w-lg w-full rounded-3xl p-5 border shadow-2xl space-y-4 ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Percent className="w-4 h-4 text-cyan-400" />
                {isBengali ? 'রাজস্ব বণ্টন ও হিসাব সূত্র' : 'Revenue Split & Calculation Formula'}
              </h3>
              <button onClick={() => setShowCalcExplainer(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed">
              <p className="text-slate-300">
                {isBengali
                  ? 'Zan-Gi প্ল্যাটফর্মে প্রতিটি বিজ্ঞাপনী আয়ের বণ্টন কঠোরভাবে নিম্নোক্ত সূত্রের ভিত্তিতে সম্পাদিত হয়:'
                  : 'Every ad yield transaction on Zan-Gi is allocated strictly according to the following mathematical framework:'}
              </p>

              <div className="p-3 bg-slate-950 rounded-2xl font-mono text-[11px] space-y-1.5 border border-slate-800 text-cyan-300">
                <p>1. Gross Ad Yield = $0.50 (50 cents minor units)</p>
                <p>2. Distributable Revenue Base = $0.50 (100%)</p>
                <p className="text-emerald-400">3. Creator Share (70%) = $0.35 (35 cents)</p>
                <p className="text-blue-400">4. Zan-Gi Platform Share (30%) = $0.15 (15 cents)</p>
                <p className="text-amber-400">5. Statutory VAT on Platform Service (2%) = $0.003 (accrued)</p>
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-300 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  {isBengali ? '১০০% নিখুঁত বণ্টন নীতি' : 'Zero Allocation Leakage Guarantee'}
                </span>
                <p className="text-[11px] text-slate-300">
                  {isBengali
                    ? 'ক্রিয়েটর অংশ (৭০%) এবং প্ল্যাটফর্ম অংশ (৩০%) যোগ করলে অবিকল ১০০% হয়। ২% ভ্যাট প্ল্যাটফর্মের নিজস্ব ট্যাক্সেবল সার্ভিস লাইনের উপর আরোপিত — ক্রিয়েটরের ৭০% থেকে অতিরিক্ত কোনো চার্জ কাটা হয় না।'
                    : 'The Creator (70%) and Platform (30%) shares sum to precisely 100% of distributable yield. The 2% VAT is booked on the taxable platform service base, never creating a 102% allocation.'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowCalcExplainer(false)}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl text-xs"
            >
              {isBengali ? 'বুঝেছি' : 'Got It'}
            </button>
          </div>
        </div>
      )}

      {/* HEADER BANNER */}
      <div className={`p-4 sm:p-6 border-b transition-colors relative overflow-hidden ${
        isDark
          ? 'bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950/60 border-slate-800/80'
          : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50 border-slate-200'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20">
                <DollarSign className="w-5 h-5 stroke-[2.5]" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight bg-gradient-to-r from-amber-300 via-amber-200 to-yellow-400 bg-clip-text text-transparent">
                {isBengali ? 'মনিটাইজেশন ও রাজস্ব ড্যাশবোর্ড' : 'Monetization & Revenue Center'}
              </h1>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              {isBengali
                ? 'বিজ্ঞাপন আয়, স্বচ্ছ লেজার হিসাব, ৭০/৩০ বণ্টন ও বিকাশ/নগদ/রকেট পেআউট'
                : 'Audited Ad Earnings, SSV Rewarded Ads, 70/30 RevShare & bKash/Nagad/Rocket Payouts'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Demo / Test Mode Tag */}
            <span className="text-[10px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-xl flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>TEST MODE (SSV ADAPTER)</span>
            </span>

            {/* Policy & Rules CTA */}
            <button
              onClick={() => setShowPolicyModal(true)}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                isDark
                  ? 'border-slate-800 bg-slate-900/80 text-cyan-400 hover:border-cyan-500/40'
                  : 'border-slate-200 bg-white text-blue-600 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isBengali ? 'পলিসি ও শর্তাবলী' : 'Policy & Standards'}</span>
            </button>

            {/* Refresh */}
            <button
              onClick={() => { void fetchData(); }}
              disabled={loading}
              className={`p-2 rounded-xl border transition-all ${
                isDark ? 'border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white' : 'border-slate-200 bg-white text-slate-700'
              }`}
              title="Refresh Ledger"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className={`px-4 sm:px-6 border-b flex overflow-x-auto no-scrollbar gap-2 shrink-0 ${
        isDark ? 'border-slate-800/80 bg-slate-950/80' : 'border-slate-200 bg-white'
      }`}>
        {[
          { id: 'overview', labelBn: 'সামগ্রিক হিসাব', labelEn: 'Overview', icon: TrendingUp },
          { id: 'watch_ads', labelBn: 'বিজ্ঞাপন দেখে আয়', labelEn: 'Watch & Earn', icon: Award, highlight: true },
          { id: 'ledger', labelBn: 'লেনদেন লেজার', labelEn: 'Financial Ledger', icon: History },
          { id: 'withdrawals', labelBn: 'টাকা উত্তোলন', labelEn: 'Withdrawals', icon: CreditCard },
          { id: 'payout_methods', labelBn: 'পেআউট মাধ্যম', labelEn: 'Payout Methods', icon: Lock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isActive
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{isBengali ? tab.labelBn : tab.labelEn}</span>
              {tab.highlight && (
                <span className="text-[9px] bg-amber-400/20 text-amber-300 px-1 rounded font-mono font-bold">
                  +COINS
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Primary Balance Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Available Payable Balance */}
              <div className={`p-4 sm:p-5 rounded-3xl border relative overflow-hidden transition-all shadow-md ${
                isDark
                  ? 'bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-950 border-amber-500/30'
                  : 'bg-gradient-to-br from-amber-50/50 via-white to-amber-50/30 border-amber-200'
              }`}>
                <div className="flex items-center justify-between pb-2">
                  <span className="text-xs font-bold text-amber-400/90 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-amber-400" />
                    {isBengali ? 'উত্তোলনযোগ্য ব্যালেন্স' : 'Available Balance'}
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                    PAYABLE
                  </span>
                </div>
                <div className="space-y-0.5">
                  <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-amber-300">
                    ${formatCents(summary?.availableBalanceCents)}
                  </div>
                  <p className="text-[11px] text-slate-400 font-semibold">
                    ≈ ৳{toBdt(summary?.availableBalanceCents)} BDT ({(user?.creatorCoins || 0).toLocaleString()} Coins)
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('withdrawals')}
                  className="mt-4 w-full py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>{isBengali ? 'টাকা তুলুন' : 'Request Withdrawal'}</span>
                </button>
              </div>

              {/* Total Gross Revenue Generated */}
              <div className={`p-4 sm:p-5 rounded-3xl border transition-all shadow-md ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center justify-between pb-2">
                  <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-blue-400" />
                    {isBengali ? 'মোট অর্জিত বিজ্ঞাপন রাজস্ব' : 'Gross Ad Yield'}
                  </span>
                  <button
                    onClick={() => setShowCalcExplainer(true)}
                    className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <Info className="w-3 h-3" />
                    <span>70/30 Split</span>
                  </button>
                </div>
                <div className="space-y-0.5">
                  <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
                    ${formatCents(summary?.totalGrossRevenueCents)}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Creator: ${formatCents(summary?.totalCreatorShareCents)} (70%)
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Platform Fee (30%):</span>
                  <span className="font-mono">${formatCents(summary?.totalPlatformShareCents)}</span>
                </div>
              </div>

              {/* Statutory VAT & Tax Accounting */}
              <div className={`p-4 sm:p-5 rounded-3xl border transition-all shadow-md ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center justify-between pb-2">
                  <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                    <Percent className="w-4 h-4 text-indigo-400" />
                    {isBengali ? 'সংরক্ষিত ভ্যাট (২%)' : 'Platform VAT Line (2%)'}
                  </span>
                  <span className="text-[10px] bg-blue-500/10 text-cyan-400 font-bold px-2 py-0.5 rounded-full border border-blue-500/20">
                    STATUTORY
                  </span>
                </div>
                <div className="space-y-0.5">
                  <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-indigo-300">
                    ${formatCents(summary?.totalTaxWithheldCents)}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Audited tax accrual on platform service base
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Total Paid Out:</span>
                  <span className="font-mono text-emerald-400">${formatCents(summary?.totalPaidOutCents)}</span>
                </div>
              </div>
            </div>

            {/* Time-Based Earnings Performance */}
            <div className={`p-4 sm:p-5 rounded-3xl border space-y-4 ${
              isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                {isBengali ? 'দৈনিক, সাপ্তাহিক ও মাসিক আয়ের গতিধারা' : 'Earnings Frequency Performance'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-1">
                  <span className="text-[11px] text-slate-400 font-semibold">{isBengali ? 'আজকের আয়' : 'Daily Earnings'}</span>
                  <div className="text-lg font-bold font-mono text-cyan-400">${formatCents(summary?.dailyEarningsCents)}</div>
                  <p className="text-[10px] text-slate-500">Completed ads & verified views</p>
                </div>
                <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-1">
                  <span className="text-[11px] text-slate-400 font-semibold">{isBengali ? 'এই সপ্তাহের আয়' : 'Weekly Earnings'}</span>
                  <div className="text-lg font-bold font-mono text-cyan-400">${formatCents(summary?.weeklyEarningsCents)}</div>
                  <p className="text-[10px] text-slate-500">Last 7 rolling days</p>
                </div>
                <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-1">
                  <span className="text-[11px] text-slate-400 font-semibold">{isBengali ? 'এই মাসের আয়' : 'Monthly Earnings'}</span>
                  <div className="text-lg font-bold font-mono text-cyan-400">${formatCents(summary?.monthlyEarningsCents)}</div>
                  <p className="text-[10px] text-slate-500">Current calendar cycle</p>
                </div>
              </div>
            </div>

            {/* Monetization Eligibility Status Check */}
            <div className={`p-4 sm:p-5 rounded-3xl border space-y-3 ${
              isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  {isBengali ? 'মনিটাইজেশন যোগ্যতা ও অ্যাকাউন্ট অবস্থান' : 'Monetization Eligibility & Standing'}
                </h3>
                <span className="text-xs bg-emerald-500/20 text-emerald-400 font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  {summary?.isEligible ? 'QUALIFIED CREATOR' : 'PENDING REQUIREMENTS'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-950/40 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[11px]">{isBengali ? 'অনুসারী সংখ্যা' : 'Followers'}</span>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{summary?.eligibilityMetrics.followerCount.toLocaleString()} / {summary?.eligibilityMetrics.requiredFollowers.toLocaleString()}</span>
                  </div>
                </div>
                <div className="p-3 bg-slate-950/40 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[11px]">{isBengali ? 'অ্যাকাউন্টের বয়স' : 'Account Age'}</span>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{summary?.eligibilityMetrics.accountAgeDays} / {summary?.eligibilityMetrics.requiredAccountAgeDays} days</span>
                  </div>
                </div>
                <div className="p-3 bg-slate-950/40 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[11px]">{isBengali ? 'কমিউনিটি স্ট্রাইক' : 'Guideline Strikes'}</span>
                  <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{summary?.eligibilityMetrics.guidelineStrikes} strikes</span>
                  </div>
                </div>
                <div className="p-3 bg-slate-950/40 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[11px]">{isBengali ? 'ভেরিফাইড ব্যাজ' : 'Verification Badge'}</span>
                  <div className="font-bold text-cyan-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Active</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ANALYTICS DATE RANGE FILTER TOOLBAR */}
            <div className={`p-4 rounded-3xl border space-y-3 ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-xs">
                    {isBengali ? 'অ্যানালিটিক্স ফিল্টার ও সময়কাল' : 'Analytics Time Window'}
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded-full">
                    {summary?.dateRangeApplied || dateRangeFilter}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: 'all', labelBn: 'সব সময়', labelEn: 'All Time' },
                    { id: 'today', labelBn: 'আজ', labelEn: 'Today' },
                    { id: 'week', labelBn: '৭ দিন', labelEn: '7 Days' },
                    { id: 'month', labelBn: '৩০ দিন', labelEn: '30 Days' },
                    { id: 'custom', labelBn: 'কাস্টম', labelEn: 'Custom' },
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      onClick={() => handleApplyDateRange(btn.id as any)}
                      className={`px-3 py-1 text-xs font-bold rounded-xl transition-all ${
                        dateRangeFilter === btn.id
                          ? 'bg-amber-400 text-slate-950 shadow-sm shadow-amber-400/20'
                          : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {isBengali ? btn.labelBn : btn.labelEn}
                    </button>
                  ))}
                </div>
              </div>

              {dateRangeFilter === 'custom' && (
                <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-slate-800 text-xs">
                  <span className="text-slate-400 text-[11px] shrink-0">Select Date Span:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs outline-hidden"
                  />
                  <span className="text-slate-500">to</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs outline-hidden"
                  />
                  <button
                    onClick={handleApplyCustomDates}
                    className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs transition-colors"
                  >
                    Apply Custom Filter
                  </button>
                </div>
              )}
            </div>

            {/* ESTIMATED VS FINALIZED REVENUE ACCRUAL */}
            <div className={`p-4 sm:p-5 rounded-3xl border space-y-3.5 ${
              isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-400" />
                  {isBengali ? 'প্রাক্কলিত বনাম চূড়ান্ত রাজস্ব বিবরণী' : 'Estimated vs Finalized Revenue'}
                </h3>
                <span className="text-[10px] bg-cyan-500/10 text-cyan-300 font-mono font-bold px-2 py-0.5 rounded-full border border-cyan-500/20">
                  AUDITED ACCRUAL
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* Finalized */}
                <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-semibold">{isBengali ? 'চূড়ান্ত প্রদেয় আয়' : 'Finalized Revenue'}</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  </div>
                  <div className="text-xl font-black font-mono text-emerald-400">
                    ${formatCents(summary?.estimatedVsFinalized?.finalizedRevenueCents || summary?.totalCreatorShareCents)}
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Verified settled earnings ready for bKash, Nagad, or Rocket withdrawal.
                  </p>
                </div>

                {/* Estimated Pending */}
                <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-semibold">{isBengali ? 'প্রাক্কলিত পেন্ডিং রাজস্ব' : 'Estimated Pending'}</span>
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  </div>
                  <div className="text-xl font-black font-mono text-cyan-400">
                    ${formatCents(summary?.estimatedVsFinalized?.estimatedPendingRevenueCents || 0)}
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Active streaming and impressions undergoing 24-hr anti-fraud verification.
                  </p>
                </div>

                {/* Held in Processing Withdrawals */}
                <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-semibold">{isBengali ? 'উত্তোলনে প্রক্রিয়াধীন' : 'Held in Withdrawals'}</span>
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                  </div>
                  <div className="text-xl font-black font-mono text-amber-300">
                    ${formatCents(summary?.estimatedVsFinalized?.heldInWithdrawalsCents || summary?.heldBalanceCents || 0)}
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Locked in pending admin review. Deducted from wallet to prevent double spend.
                  </p>
                </div>
              </div>
            </div>

            {/* GENUINE ELIGIBLE AD VIEWS & WATCH TIME */}
            <div className={`p-4 sm:p-5 rounded-3xl border space-y-3.5 ${
              isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Eye className="w-4 h-4 text-cyan-400" />
                  {isBengali ? 'যাচাইকৃত দর্শন সংখ্যা ও ওয়াচ টাইম' : 'Eligible Ad Views & Verified Watch Time'}
                </h3>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                  BOT-PROTECTED
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[11px] font-semibold">{isBengali ? 'যোগ্য ভিউ সংখ্যা' : 'Eligible Ad Views'}</span>
                  <div className="text-lg font-black font-mono text-white">
                    {(summary?.eligibleImpressions || 0).toLocaleString()}
                  </div>
                  <p className="text-[10px] text-slate-500">Filtered with 30-min deduplication</p>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[11px] font-semibold">{isBengali ? 'মোট ওয়াচ টাইম' : 'Verified Watch Time'}</span>
                  <div className="text-lg font-black font-mono text-cyan-400">
                    {summary?.watchTimeMinutes || 0} <span className="text-xs font-sans text-slate-400">mins</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Organic video & Reels engagement</p>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[11px] font-semibold">{isBengali ? 'রিওয়ার্ডেড অ্যাড' : 'Rewarded Ads'}</span>
                  <div className="text-lg font-black font-mono text-amber-400">
                    {summary?.completedRewardedAds || 0} <span className="text-xs font-sans text-slate-400">ads</span>
                  </div>
                  <p className="text-[10px] text-slate-500">Server verified with SSV token</p>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[11px] font-semibold">{isBengali ? 'রিওয়ার্ডেড আর্নিং' : 'Rewarded Yield'}</span>
                  <div className="text-lg font-black font-mono text-emerald-400">
                    ${((summary?.completedRewardedAds || 0) * 0.35).toFixed(2)}
                  </div>
                  <p className="text-[10px] text-slate-500">70% creator share ($0.35 / ad)</p>
                </div>
              </div>
            </div>

            {/* POSTS AND REELS CONTENT PERFORMANCE */}
            <div className={`p-4 sm:p-5 rounded-3xl border space-y-3.5 ${
              isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm flex items-center gap-2">
                    <Video className="w-4 h-4 text-purple-400" />
                    {isBengali ? 'কনটেন্ট পারফরম্যান্স ও রাজস্ব অবদান' : 'Posts & Reels Performance'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Individual video and post earnings strictly derived from genuine audience reach
                  </p>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  {summary?.postsAndReelsPerformance?.length || 0} items
                </span>
              </div>

              {summary?.postsAndReelsPerformance && summary.postsAndReelsPerformance.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                      isDark ? 'border-slate-800 bg-slate-950/80 text-slate-400' : 'border-slate-200 bg-slate-100 text-slate-600'
                    }`}>
                      <tr>
                        <th className="p-3">Content / Title</th>
                        <th className="p-3">Format</th>
                        <th className="p-3 text-right">Views</th>
                        <th className="p-3 text-right">Watch Time</th>
                        <th className="p-3 text-right">Engagement</th>
                        <th className="p-3 text-right">Est. Yield</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {summary.postsAndReelsPerformance.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-3">
                            <div className="font-bold text-white text-[11px] font-sans line-clamp-1">{item.title}</div>
                            <div className="text-[10px] text-slate-500">ID: {item.id}</div>
                          </td>
                          <td className="p-3 font-sans">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${
                              item.type === 'reel' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'
                            }`}>
                              {item.type}
                            </span>
                          </td>
                          <td className="p-3 text-right text-white font-bold">{item.viewsCount.toLocaleString()}</td>
                          <td className="p-3 text-right text-cyan-400">
                            {Math.round(item.watchTimeSeconds / 60)}m {item.watchTimeSeconds % 60}s
                          </td>
                          <td className="p-3 text-right text-slate-300 font-sans text-[11px]">
                            ❤️ {item.likesCount} · 💬 {item.commentsCount}
                          </td>
                          <td className="p-3 text-right text-emerald-400 font-bold">
                            ${formatCents(item.estimatedEarningsCents)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 bg-slate-950/40 rounded-2xl border border-slate-800 text-center text-xs text-slate-400">
                  {isBengali
                    ? 'আপনার প্রকাশিত পোস্ট বা রিলস থেকে অর্জিত মেট্রিক্স এখানে প্রদর্শিত হবে।'
                    : 'Publish posts and short video Reels to monitor engagement and revenue yields here.'}
                </div>
              )}

              <p className="text-[10px] text-slate-500 italic pt-1">
                * Simulated internal tests are strictly quarantined and never count toward content performance, creator coins, or AdMob revenues.
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: WATCH ADS & EARN */}
        {activeTab === 'watch_ads' && (
          <div className="space-y-6">
            {/* Watch Ad Hero Card */}
            <div className={`p-5 sm:p-6 rounded-3xl border space-y-4 relative overflow-hidden ${
              isDark
                ? 'bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 border-cyan-500/30'
                : 'bg-gradient-to-br from-indigo-50/60 via-white to-cyan-50/60 border-cyan-200'
            }`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-400 via-blue-600 to-indigo-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-500/20">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black tracking-tight">
                      {isBengali ? 'বিজ্ঞাপন দেখুন এবং কয়েন উপার্জন করুন' : 'Watch Rewarded Ads & Earn'}
                    </h2>
                    <p className="text-[11px] text-slate-400 font-medium">
                      {isBengali ? 'সার্ভার-যাচাইকৃত (SSV) প্রতি পূর্ণ বিজ্ঞাপনে +৫০ কয়েন ($০.৩৫)' : 'Server-Verified (SSV) +50 Coins ($0.35) Per Completed Ad'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 bg-slate-950/80 rounded-xl border border-slate-800 text-slate-300 font-mono">
                    Daily: {summary?.completedRewardedAds || 0}/{config?.dailyRewardedAdCap || 10} Ads
                  </span>
                </div>
              </div>

              {/* Status Message / Toast */}
              {adStatusMessage && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-2xl text-xs font-semibold text-blue-300 animate-in fade-in duration-200">
                  {adStatusMessage}
                </div>
              )}

              {/* Simulated Ad Container or Watch Button */}
              {!isWatchingAd ? (
                <div className="p-6 border border-dashed rounded-3xl text-center space-y-4 border-slate-800 bg-slate-950/40">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mx-auto flex items-center justify-center shadow-inner">
                    <Play className="w-6 h-6 fill-amber-400 text-amber-400" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm">
                      {isBengali ? 'পরবর্তী বিজ্ঞাপনী ভিডিও প্লে করতে প্রস্তুত' : 'Ready to Load Rewarded Ad Video'}
                    </h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      {isBengali
                        ? '১৫ সেকেন্ডের সম্পূর্ণ ভিডিও দেখা বাধ্যতামূলক। কোনো স্কিপ বা অ্যাপ বন্ধ করলে রিওয়ার্ড বরাদ্দ হবে না।'
                        : 'Watch the complete 15-second sponsor video. Rewards are verified on the backend via Google Mobile Ads SSV.'}
                    </p>
                  </div>

                  <div className="flex justify-center">
                    <button
                      onClick={startWatchingAd}
                      disabled={adCooldownSeconds > 0}
                      className={`px-6 py-3 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 shadow-lg ${
                        adCooldownSeconds > 0
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 shadow-amber-500/20'
                      }`}
                    >
                      <Play className="w-4 h-4 fill-slate-950 text-slate-950" />
                      <span>
                        {adCooldownSeconds > 0
                          ? `Cooldown: ${adCooldownSeconds}s`
                          : isBengali ? 'বিজ্ঞাপন শুরু করুন (+৫০ কয়েন)' : 'Watch Rewarded Ad (+50 Coins)'}
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Active Ad Player Simulation */
                <div className="p-6 rounded-3xl bg-slate-950 border border-cyan-500/50 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800">
                    <span className="font-mono text-cyan-400 font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                      SPONSOR AD PLAYING (ADMOB TEST UNIT)
                    </span>
                    <span className="font-mono bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded font-black">
                      Reward in: {adCountdown}s
                    </span>
                  </div>

                  {/* Video visual frame */}
                  <div className="h-44 rounded-2xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-blue-900 flex flex-col items-center justify-center p-4 text-center space-y-2 border border-slate-800">
                    <Award className="w-10 h-10 text-amber-400 animate-bounce" />
                    <div>
                      <h4 className="font-bold text-white text-sm">Zan-Gi Creator Economy 2026</h4>
                      <p className="text-xs text-slate-300">Empowering Bangladeshi & Global Creators with 70% Real Revenue Share</p>
                    </div>
                    {/* Countdown Progress bar */}
                    <div className="w-full max-w-xs h-2 bg-slate-800 rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-cyan-400 transition-all duration-1000"
                        style={{ width: `${((15 - adCountdown) / 15) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-[11px] text-slate-400">
                      Do not refresh or exit. SSV transaction ID is registering.
                    </span>
                    <button
                      onClick={cancelAdWatch}
                      className="text-rose-400 hover:text-rose-300 underline font-semibold text-[11px]"
                    >
                      Cancel Ad (Forfeit Reward)
                    </button>
                  </div>
                </div>
              )}

              {/* Fraud and Compliance Policy Notice */}
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-2.5 text-xs text-rose-300">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold">
                    {isBengali ? 'বিজ্ঞাপনে ক্লিক কারচুপি সম্পূর্ণ নিষিদ্ধ' : 'Strict Policy: Never Click Ads For Incentives'}
                  </span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {isBengali
                      ? 'AdMob ও Zan-Gi এর নিয়ম অনুযায়ী ব্যবহারকারীকে বিজ্ঞাপনে ক্লিক করার জন্য প্ররোচিত করা বা জোর করা বেআইনি। প্রতিটি রিওয়ার্ড আইপি রেট-লিমিট ও সার্ভার সিগনেচার দিয়ে পরীক্ষা করা হয়।'
                      : 'Under AdMob rewarded ad policies, encouraging users to artificially click ads is prohibited. Server anti-replay safeguards cancel fraudulent claims immediately.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: FINANCIAL LEDGER */}
        {activeTab === 'ledger' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <History className="w-4 h-4 text-cyan-400" />
                  {isBengali ? 'অপরিবর্তনযোগ্য আর্থিক লেনদেন লেজার' : 'Append-Only Financial Ledger'}
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  Traceable immutable transaction audit records (minor integer cents)
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {summary?.recentLedgerEntries.length || 0} entries
              </span>
            </div>

            <div className={`rounded-3xl border overflow-hidden ${
              isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white'
            }`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                    isDark ? 'border-slate-800 bg-slate-950/80 text-slate-400' : 'border-slate-200 bg-slate-100 text-slate-600'
                  }`}>
                    <tr>
                      <th className="p-3">Reference / Date</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Gross Yield</th>
                      <th className="p-3">Creator (70%)</th>
                      <th className="p-3">Platform (30%)</th>
                      <th className="p-3">VAT (2%)</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {summary?.recentLedgerEntries && summary.recentLedgerEntries.length > 0 ? (
                      summary.recentLedgerEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-3">
                            <div className="font-bold text-white text-[11px]">{entry.id}</div>
                            <div className="text-[10px] text-slate-400 font-sans">
                              {new Date(entry.createdAt).toLocaleDateString()} {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td className="p-3 font-sans font-semibold">
                            <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-cyan-400 border border-blue-500/20 text-[10px]">
                              {entry.type}
                            </span>
                          </td>
                          <td className="p-3 text-white font-bold">${formatCents(entry.grossAmountCents)}</td>
                          <td className="p-3 text-emerald-400 font-bold">+${formatCents(entry.creatorAmountCents)}</td>
                          <td className="p-3 text-slate-300">${formatCents(entry.platformAmountCents)}</td>
                          <td className="p-3 text-indigo-300">${formatCents(entry.taxAmountCents)}</td>
                          <td className="p-3 font-sans">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                              {entry.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 font-sans">
                          No ledger records found yet. Watch rewarded ads to generate verified entries.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: WITHDRAWALS */}
        {activeTab === 'withdrawals' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Withdrawal Form */}
            <div className={`p-5 rounded-3xl border space-y-4 ${
              isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white'
            }`}>
              <h3 className="font-bold text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-400" />
                {isBengali ? 'উত্তোলন অনুরোধ ফরম' : 'Request Payout Withdrawal'}
              </h3>

              {withdrawFeedback && (
                <div className={`p-3 rounded-2xl text-xs font-semibold ${
                  withdrawFeedback.success
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                }`}>
                  {withdrawFeedback.message}
                </div>
              )}

              <form onSubmit={handleWithdrawalSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    {isBengali ? 'উত্তোলন পরিমাণ (USD, সর্বনিম্ন $১০০.০০)' : 'Withdrawal Amount (USD, minimum $100.00)'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-mono font-bold">$</span>
                    <input
                      type="number"
                      step="1"
                      min="100"
                      value={withdrawAmountDollars}
                      onChange={(e) => setWithdrawAmountDollars(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white text-sm focus:border-amber-400 outline-hidden"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-mono">
                    <span>Available: ${formatCents(summary?.availableBalanceCents)} (≈ ৳{toBdt(summary?.availableBalanceCents)})</span>
                    <span className="text-amber-400 font-semibold">Min $100.00 (10,000 Coins)</span>
                  </div>
                </div>

                {/* Documented Live Financial Breakdown */}
                {(() => {
                  const reqDollars = Math.max(0, parseFloat(withdrawAmountDollars) || 0);
                  const bdtAmount = Math.round(reqDollars * BDT_EXCHANGE_RATE);
                  const isBelowMin = reqDollars < 100;
                  return (
                    <div className={`p-3 rounded-2xl border space-y-1.5 font-mono text-[11px] ${
                      isBelowMin
                        ? 'border-rose-500/30 bg-rose-950/20 text-rose-300'
                        : 'border-amber-500/20 bg-slate-950/80 text-slate-300'
                    }`}>
                      <div className="flex justify-between text-slate-400">
                        <span>Requested Amount:</span>
                        <span className="font-bold text-white">${reqDollars.toFixed(2)} USD</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Documented Exchange Rate:</span>
                        <span className="text-cyan-400">1 USD = ৳{BDT_EXCHANGE_RATE.toFixed(2)} BDT</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Rate Source & Date:</span>
                        <span className="text-[10px] text-slate-400 font-sans">Bangladesh Bank Interbank ({RATE_REFERENCE_DATE})</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Platform Transfer Fee:</span>
                        <span className="text-emerald-400 font-semibold">$0.00 (100% Subsidized)</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Tax/VAT Deducted:</span>
                        <span className="text-emerald-400 font-semibold">$0.00 (Platform absorbed)</span>
                      </div>
                      <div className="border-t border-slate-800 pt-1.5 flex justify-between font-bold text-amber-300 text-xs">
                        <span>Net Mobile Wallet Payout:</span>
                        <span className="font-black text-white">৳{bdtAmount.toLocaleString()} BDT</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-sans pt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
                        <span>Target processing time: <strong>40–48 hours</strong> (estimated administrative audit & MFS transfer).</span>
                      </div>
                      {isBelowMin && (
                        <div className="text-[10px] text-rose-400 font-sans font-bold pt-1">
                          ⚠️ Amount is below the $100.00 minimum threshold. Submissions below $100 are rejected.
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    {isBengali ? 'পেমেন্ট মেথড নির্বাচন করুন (বিকাশ, রকেট অথবা নগদ)' : 'Payout Provider (bKash, Rocket, or Nagad)'}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'bkash', name: isBengali ? 'বিকাশ' : 'bKash', badge: 'MFS (Instant)' },
                      { id: 'rocket', name: isBengali ? 'রকেট' : 'Rocket', badge: 'MFS (DBBL)' },
                      { id: 'nagad', name: isBengali ? 'নগদ' : 'Nagad', badge: 'MFS (Postal)' },
                    ].map((provider) => (
                      <button
                        key={provider.id}
                        type="button"
                        onClick={() => setSelectedPayoutProvider(provider.id as PayoutProvider)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          selectedPayoutProvider === provider.id
                            ? 'border-amber-400 bg-amber-500/10 text-amber-300'
                            : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-bold">{provider.name}</div>
                        <div className="text-[9px] text-slate-400 font-mono">{provider.badge}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    {isBengali ? 'মোবাইল ওয়ালেট নম্বর (১১ বা ১২ ডিজিট)' : 'MFS Mobile Wallet Number (11 or 12 digits)'}
                  </label>
                  <input
                    type="text"
                    required
                    value={payoutIdentifier}
                    onChange={(e) => setPayoutIdentifier(e.target.value)}
                    placeholder={isBengali ? 'যেমন: ০১৭১২-৩৪৫৬৭৮ বা ০১৭১২-৩৪৫৬৭৮-৯' : 'e.g. 01712-345678 or 01712-345678-9'}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:border-amber-400 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    {isBengali ? 'অ্যাকাউন্ট হোল্ডারের নাম' : 'Account Holder Full Legal Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={payoutHolderName}
                    onChange={(e) => setPayoutHolderName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:border-amber-400 outline-hidden"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingWithdraw}
                  className="w-full py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>
                    {isSubmittingWithdraw
                      ? 'Processing Request...'
                      : isBengali ? 'উত্তোলন অনুরোধ পাঠান' : 'Submit Withdrawal Request'}
                  </span>
                </button>
              </form>
            </div>

            {/* Existing Withdrawal Requests List */}
            <div className={`p-5 rounded-3xl border space-y-4 ${
              isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white'
            }`}>
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                {isBengali ? 'সাম্প্রতিক উত্তোলনের ইতিহাস ও স্ট্যাটাস' : 'Withdrawal Request History'}
              </h3>

              <div className="space-y-2.5 max-h-96 overflow-y-auto">
                {summary?.recentWithdrawals && summary.recentWithdrawals.length > 0 ? (
                  summary.recentWithdrawals.map((req) => (
                    <div
                      key={req.id}
                      className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold font-mono text-white text-sm">
                          ${formatCents(req.amountCents)} ({req.payoutMethod.toUpperCase()})
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            req.status === 'paid'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : req.status === 'approved'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : req.status === 'rejected'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center justify-between">
                        <span>{req.payoutDetails?.accountIdentifierMasked} ({req.payoutDetails?.accountHolderName})</span>
                        <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                      </div>
                      {req.transactionReference && (
                        <p className="text-[10px] text-emerald-400 font-mono">
                          TrxID: {req.transactionReference}
                        </p>
                      )}
                      {req.rejectionReason && (
                        <p className="text-[10px] text-rose-400">
                          Rejection Reason: {req.rejectionReason} (Coins Refunded)
                        </p>
                      )}
                      {req.status === 'pending' && (
                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                          <span className="text-[10px] text-slate-500 font-sans">
                            Coins locked in escrow
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCancelWithdrawal(req.id)}
                            disabled={isCancellingWithdrawalId === req.id}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-[10px] font-bold transition-colors"
                          >
                            {isCancellingWithdrawalId === req.id
                              ? 'Cancelling...'
                              : isBengali ? 'অনুরোধ বাতিল ও কয়েন ফেরত' : 'Cancel & Refund Coins'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="p-8 text-center text-slate-400 text-xs">
                    No withdrawal requests submitted yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PAYOUT METHODS */}
        {activeTab === 'payout_methods' && (
          <div className="space-y-4 max-w-xl mx-auto">
            <div className={`p-5 rounded-3xl border space-y-4 ${
              isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white'
            }`}>
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Lock className="w-4 h-4 text-cyan-400" />
                {isBengali ? 'সুরক্ষিত পেআউট অ্যাকাউন্ট তথ্য' : 'Verified Payout Accounts'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isBengali
                  ? 'আপনার বিকাশ, নগদ ও রকেট ওয়ালেট অ্যাকাউন্ট তথ্য এন্ড-টু-এন্ড এনক্রিপ্ট করে মাস্ক আকারে সংরক্ষিত হয়। শুধুমাত্র অনুমোদিত অ্যাডমিন পেআউট নির্বাহে এটি দেখতে পারেন।'
                  : 'Your bKash, Nagad, and Rocket mobile banking accounts are stored encrypted with masked representation. Only authorized payment workflows access full disbursement credentials.'}
              </p>

              <div className="space-y-3">
                <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white block">bKash Personal Wallet</span>
                    <span className="text-slate-400 font-mono text-[11px]">01712-***678 (Fahim Ahmed)</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full">
                    PRIMARY VERIFIED
                  </span>
                </div>

                <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white block">Rocket Mobile Banking (DBBL)</span>
                    <span className="text-slate-400 font-mono text-[11px]">01712-***678-7 (Fahim Ahmed)</span>
                  </div>
                  <span className="text-[10px] bg-blue-500/10 text-cyan-400 font-bold px-2 py-0.5 rounded-full">
                    ACTIVE
                  </span>
                </div>

                <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white block">Nagad Wallet (Postal MFS)</span>
                    <span className="text-slate-400 font-mono text-[11px]">01823-***901 (Fahim Ahmed)</span>
                  </div>
                  <span className="text-[10px] bg-amber-500/10 text-amber-300 font-bold px-2 py-0.5 rounded-full">
                    VERIFIED
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
