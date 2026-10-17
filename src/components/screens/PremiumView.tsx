import React, { useState, useEffect } from 'react';
import {
  Crown,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Coins,
  Clock,
  History,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  Zap,
  Star,
  RefreshCw,
  Award
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

interface PremiumPlan {
  id: 'creator_pro' | 'creator_vip' | 'creator_elite';
  name: string;
  nameBn: string;
  tier: 'basic' | 'pro' | 'creator_plus';
  durationDays: number;
  durationLabel: string;
  durationLabelBn: string;
  priceInCoins: number;
  benefits: string[];
  benefitsBn: string[];
  isPopular?: boolean;
}

interface PremiumDetailsResponse {
  isPremium: boolean;
  tier: string;
  expiresAt: string | null;
  daysRemaining: number;
  coinBalance: number;
  availablePlans: PremiumPlan[];
  history: Array<{
    id: string;
    action: string;
    timestamp: string;
    details: Record<string, any>;
  }>;
}

interface PremiumViewProps {
  isBengali: boolean;
  onBack: () => void;
  onOpenAuth: () => void;
}

export const PremiumView: React.FC<PremiumViewProps> = ({
  isBengali,
  onBack,
  onOpenAuth,
}) => {
  const { user, token, refreshUser } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [details, setDetails] = useState<PremiumDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PremiumPlan | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const fetchPremiumDetails = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/users/premium/details', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to load subscription status');
      }
      const data = await res.json();
      setDetails(data);
    } catch (err: any) {
      console.error('Error fetching premium status:', err);
      setError(err.message || 'Error connecting to subscription service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPremiumDetails();
  }, [token]);

  const handleConfirmPurchase = async () => {
    if (!selectedPlan || !token) return;
    setIsPurchasing(true);
    setPurchaseError(null);
    setPurchaseSuccess(null);

    try {
      const res = await fetch('/api/users/premium/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId: selectedPlan.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Purchase failed');
      }

      setPurchaseSuccess(
        isBengali
          ? `🎉 সফল! আপনি ${selectedPlan.nameBn} প্ল্যানে আপগ্রেড হয়েছেন। আপনার প্রিমিয়াম সুবিধা এখন সক্রিয়।`
          : `🎉 Success! Upgraded to ${selectedPlan.name}. Premium benefits are now active.`
      );
      setSelectedPlan(null);
      await refreshUser();
      await fetchPremiumDetails();
    } catch (err: any) {
      setPurchaseError(err.message || 'Purchase transaction failed');
    } finally {
      setIsPurchasing(false);
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'PREMIUM_SUBSCRIPTION_PURCHASED':
        return isBengali ? 'প্রিমিয়াম সাবস্ক্রিপশন ক্রয়' : 'Premium Subscription Purchase';
      case 'COIN_TIP_SENT':
        return isBengali ? 'ক্রিয়েটর টিপ প্রদান' : 'Creator Coin Tip Sent';
      case 'COIN_TIP_RECEIVED':
        return isBengali ? 'ক্রিয়েটর টিপ প্রাপ্তি' : 'Creator Coin Tip Received';
      case 'REWARDED_AD_CLAIM':
        return isBengali ? 'রিওয়ার্ডেড অ্যাড আয়' : 'Rewarded Ad Coin Earnings';
      case 'CREATOR_WITHDRAWAL_REQUESTED':
        return isBengali ? 'উত্তোলন অনুরোধ (কয়েন হোল্ড)' : 'Withdrawal Request';
      case 'CREATOR_WITHDRAWAL_REJECTED_REFUND':
        return isBengali ? 'উত্তোলন বাতিল (কয়েন ফেরত)' : 'Withdrawal Refund';
      default:
        return action;
    }
  };

  if (!user || !token) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center p-6 text-center select-none ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-4 shadow-lg shadow-amber-500/10">
          <Crown className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold mb-2">
          {isBengali ? 'Zan-Gi ক্রিয়েটর প্রিমিয়াম' : 'Zan-Gi Creator Premium'}
        </h2>
        <p className="text-sm text-slate-500 max-w-sm mb-6 leading-relaxed">
          {isBengali
            ? 'সাবস্ক্রিপশন প্ল্যান দেখতে, কয়েন দিয়ে প্রিমিয়াম সক্রিয় করতে এবং লেনদেনের হিস্ট্রি দেখতে অনুগ্রহ করে লগইন করুন।'
            : 'Sign in to explore subscription plans, activate premium features with coins, and view transaction history.'}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
          >
            {isBengali ? 'ফিরে যান' : 'Go Back'}
          </button>
          <button
            onClick={onOpenAuth}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-sm shadow-md shadow-amber-500/20 transition-all"
          >
            {isBengali ? 'লগইন করুন' : 'Sign In'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 pb-20 select-none ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Header */}
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className={`p-2 rounded-xl border transition-colors ${
                isDark ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black flex items-center gap-2">
                  <span>{isBengali ? 'ক্রিয়েটর প্রিমিয়াম ক্লাব' : 'Creator Premium Club'}</span>
                  <Crown className="w-5 h-5 text-amber-500 fill-amber-500" />
                </h1>
                {details?.isPremium && (
                  <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-sm">
                    {details.tier.toUpperCase()} ACTIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {isBengali ? 'কয়েন দিয়ে আনলক করুন অতিরিক্ত এআই ও ক্রিয়েটর সুবিধা' : 'Unlock exclusive AI power, verification and creator advantages with coins'}
              </p>
            </div>
          </div>

          <button
            onClick={fetchPremiumDetails}
            disabled={loading}
            className={`p-2 rounded-xl border transition-all ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
            title={isBengali ? 'রিফ্রেশ' : 'Refresh'}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-500' : ''}`} />
          </button>
        </div>

        {/* Success or Error Notice */}
        {purchaseSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
            <span className="flex-1">{purchaseSuccess}</span>
            <button onClick={() => setPurchaseSuccess(null)} className="text-emerald-600 hover:opacity-75 text-xs font-bold underline">
              {isBengali ? 'বন্ধ করুন' : 'Dismiss'}
            </button>
          </div>
        )}

        {purchaseError && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
            <span className="flex-1">{purchaseError}</span>
            <button onClick={() => setPurchaseError(null)} className="text-rose-600 hover:opacity-75 text-xs font-bold underline">
              {isBengali ? 'বন্ধ করুন' : 'Dismiss'}
            </button>
          </div>
        )}

        {/* Current Status & Coin Balance Card */}
        <div className={`p-5 rounded-3xl border shadow-xl relative overflow-hidden ${
          details?.isPremium
            ? isDark
              ? 'bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border-amber-500/30 shadow-amber-950/20'
              : 'bg-gradient-to-br from-amber-50 via-white to-orange-50 border-amber-300 shadow-amber-500/10'
            : isDark
              ? 'bg-slate-900/80 border-slate-800'
              : 'bg-white border-slate-200'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {isBengali ? 'বর্তমান স্ট্যাটাস' : 'Current Status'}
                </span>
                {details?.isPremium ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-amber-500">
                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                    {isBengali ? 'প্রিমিয়াম সক্রিয়' : 'Premium Active'}
                  </span>
                ) : (
                  <span className="text-xs font-bold text-slate-400">
                    {isBengali ? 'ফ্রি প্ল্যান' : 'Standard Free Plan'}
                  </span>
                )}
              </div>

              <div className="text-lg sm:text-xl font-extrabold flex items-center gap-2">
                <span>{details?.isPremium ? `${details.tier.toUpperCase()} TIER` : (isBengali ? 'বেসিক মেম্বারশিপ' : 'Free Membership')}</span>
              </div>

              {details?.isPremium && details.expiresAt && (
                <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {isBengali
                      ? `মেয়াদ শেষ: ${new Date(details.expiresAt).toLocaleDateString('bn-BD', { dateStyle: 'medium' })} (${details.daysRemaining} দিন অবশিষ্ট)`
                      : `Expires on: ${new Date(details.expiresAt).toLocaleDateString('en-US', { dateStyle: 'medium' })} (${details.daysRemaining} days left)`}
                  </span>
                </div>
              )}
            </div>

            {/* Coin Balance Chip */}
            <div className={`p-4 rounded-2xl border flex items-center gap-3 shrink-0 ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-inner">
                <Coins className="w-5 h-5 fill-amber-500" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-semibold block uppercase">
                  {isBengali ? 'উপলব্ধ কয়েন ব্যালেন্স' : 'Available Coin Balance'}
                </span>
                <span className="text-base sm:text-lg font-black text-amber-500">
                  {((details?.coinBalance !== undefined ? details.coinBalance : user.creatorCoins) || 0).toLocaleString()}
                  <span className="text-xs font-bold text-slate-400 ml-1">Coins</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Plans Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>{isBengali ? 'সাবস্ক্রিপশন প্ল্যানসমূহ' : 'Available Subscription Plans'}</span>
            </h2>
            <span className="text-[11px] text-slate-500 font-medium">
              {isBengali ? 'কয়েন কেটে সক্রিয় হবে' : 'Billed in Creator Coins'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(details?.availablePlans || []).map((plan) => {
              const userBalance = (details?.coinBalance !== undefined ? details.coinBalance : user.creatorCoins) || 0;
              const hasEnoughCoins = userBalance >= plan.priceInCoins;
              const isCurrentTier = details?.isPremium && details.tier === plan.tier;

              return (
                <div
                  key={plan.id}
                  className={`p-5 rounded-3xl border flex flex-col justify-between relative transition-all duration-200 ${
                    plan.isPopular
                      ? isDark
                        ? 'bg-gradient-to-b from-slate-900 to-slate-900/90 border-amber-500/40 shadow-xl shadow-amber-950/20'
                        : 'bg-white border-amber-400 shadow-xl shadow-amber-500/10'
                      : isDark
                        ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {plan.isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-md">
                      {isBengali ? 'সবচেয়ে জনপ্রিয়' : 'MOST POPULAR'}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-black">
                          {isBengali ? plan.nameBn : plan.name}
                        </h3>
                        <span className="text-xs text-slate-500 font-medium">
                          {isBengali ? plan.durationLabelBn : plan.durationLabel}
                        </span>
                      </div>
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                        {plan.id === 'creator_elite' ? <Award className="w-4 h-4" /> : plan.id === 'creator_vip' ? <Zap className="w-4 h-4" /> : <Crown className="w-4 h-4" />}
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-baseline justify-between">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-amber-500">
                          {plan.priceInCoins.toLocaleString()}
                        </span>
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                          Coins
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {isBengali ? `${plan.durationDays} দিন মেয়াদ` : `${plan.durationDays} Days`}
                      </span>
                    </div>

                    {/* Benefits List */}
                    <ul className="space-y-2 text-xs">
                      {(isBengali ? plan.benefitsBn : plan.benefits).map((b, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <span className="leading-snug">{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Purchase Button */}
                  <div className="pt-5 mt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => setSelectedPlan(plan)}
                      disabled={isCurrentTier}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                        isCurrentTier
                          ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 cursor-default'
                          : hasEnoughCoins
                            ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black shadow-amber-500/20'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {isCurrentTier ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isBengali ? 'বর্তমানে সক্রিয়' : 'Currently Active'}</span>
                        </>
                      ) : hasEnoughCoins ? (
                        <>
                          <span>{isBengali ? 'কয়েন দিয়ে সক্রিয় করুন' : 'Upgrade with Coins'}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        <span>{isBengali ? 'পর্যাপ্ত কয়েন নেই' : 'Insufficient Coins'}</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Transaction History Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold flex items-center gap-2">
              <History className="w-4 h-4 text-cyan-500" />
              <span>{isBengali ? 'কয়েন লেনদেন ও ইতিহাস' : 'Coin Transaction History'}</span>
            </h2>
            <span className="text-[11px] text-slate-500 font-medium">
              {isBengali ? 'অডিট ও হিসাব বিবরণী' : 'Immutable Ledger Logs'}
            </span>
          </div>

          <div className={`rounded-3xl border overflow-hidden shadow-lg ${
            isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            {(!details?.history || details.history.length === 0) ? (
              <div className="py-10 text-center text-slate-500 text-xs">
                {isBengali ? 'কোনো কয়েন লেনদেনের রেকর্ড নেই।' : 'No coin transactions found yet.'}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
                {details.history.map((tx) => (
                  <div key={tx.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-500/5 transition-colors">
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span>{getActionLabel(tx.action)}</span>
                        {tx.details?.planName && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-mono text-[10px]">
                            {tx.details.planName}
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(tx.timestamp).toLocaleString(isBengali ? 'bn-BD' : 'en-US', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>

                    <div className="text-right">
                      {tx.details?.priceInCoins && (
                        <span className="font-black text-rose-500 block">
                          -{tx.details.priceInCoins.toLocaleString()} Coins
                        </span>
                      )}
                      {tx.details?.rewardCoins && (
                        <span className="font-black text-emerald-500 block">
                          +{tx.details.rewardCoins.toLocaleString()} Coins
                        </span>
                      )}
                      {tx.details?.amountCoins && (
                        <span className={`font-black block ${tx.action === 'COIN_TIP_SENT' ? 'text-rose-500' : 'text-emerald-500'}`}>
                          {tx.action === 'COIN_TIP_SENT' ? '-' : '+'}{tx.details.amountCoins.toLocaleString()} Coins
                        </span>
                      )}
                      {tx.details?.remainingCoins !== undefined && (
                        <span className="text-[9px] text-slate-400">
                          Bal: {tx.details.remainingCoins.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Purchase Confirmation Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className={`max-w-md w-full rounded-3xl border shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-md">
                <Crown className="w-6 h-6 fill-amber-500" />
              </div>
              <div>
                <h3 className="text-base font-black">
                  {isBengali ? 'প্ল্যান কেনার নিশ্চিতকরণ' : 'Confirm Subscription Purchase'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isBengali ? 'আপনার ব্যালেন্স থেকে কয়েন কাটা হবে' : 'Coins will be deducted securely on the server'}
                </p>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border space-y-2.5 text-xs ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">{isBengali ? 'নির্বাচিত প্ল্যান' : 'Selected Plan'}:</span>
                <span className="font-extrabold text-amber-500">{isBengali ? selectedPlan.nameBn : selectedPlan.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">{isBengali ? 'মেয়াদ' : 'Duration'}:</span>
                <span className="font-bold">{isBengali ? selectedPlan.durationLabelBn : selectedPlan.durationLabel}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">{isBengali ? 'খরচ' : 'Deduction'}:</span>
                <span className="font-black text-rose-500">-{selectedPlan.priceInCoins.toLocaleString()} Coins</span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex justify-between items-center">
                <span className="text-slate-500">{isBengali ? 'অবশিষ্ট কয়েন' : 'Balance After Purchase'}:</span>
                <span className="font-black text-emerald-500">
                  {Math.max(0, (((details?.coinBalance !== undefined ? details.coinBalance : user.creatorCoins) || 0) - selectedPlan.priceInCoins)).toLocaleString()} Coins
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedPlan(null)}
                disabled={isPurchasing}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {isBengali ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmPurchase}
                disabled={isPurchasing}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5"
              >
                {isPurchasing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{isBengali ? 'প্রসেস হচ্ছে...' : 'Processing...'}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>{isBengali ? 'নিশ্চিত করুন' : 'Confirm Purchase'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
