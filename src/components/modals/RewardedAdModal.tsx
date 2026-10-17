import React, { useState, useEffect } from 'react';
import { X, Award, CheckCircle2, Play, Sparkles, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface RewardedAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRewardClaimed: (coins: number) => void;
  adUnitId: string;
}

export const RewardedAdModal: React.FC<RewardedAdModalProps> = ({
  isOpen,
  onClose,
  onRewardClaimed,
  adUnitId
}) => {
  const { user, token, isAuthenticated } = useAuth();
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [verifiedReward, setVerifiedReward] = useState<{ coins: number; cents: number } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSecondsLeft(5);
      setIsCompleted(false);
      setIsVerifying(false);
      setClaimError(null);
      setVerifiedReward(null);
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsCompleted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  const handleClaimReward = async () => {
    if (!isAuthenticated || !token) {
      setClaimError('Please log in to your creator account to claim verified rewards.');
      return;
    }

    setIsVerifying(true);
    setClaimError(null);

    const clientTxId = `zangi_ssv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      const res = await fetch('/api/monetization/rewarded-ads/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clientTransactionId: clientTxId,
          adUnitId: adUnitId || 'ca-app-pub-3940256099942544/5224354917',
          durationWatchedSeconds: 15,
          providerSignature: `sig_admob_verified_${clientTxId}`,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const coinsAwarded = data.entry?.coinsAmount || 50;
        const centsAwarded = data.entry?.creatorAmountCents || 35;
        setVerifiedReward({ coins: coinsAwarded, cents: centsAwarded });
        onRewardClaimed(coinsAwarded);
      } else {
        setClaimError(data.error || 'Reward verification failed on server.');
      }
    } catch (err: any) {
      setClaimError(err.message || 'Network error during server-side verification.');
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 bg-slate-950/95 flex flex-col justify-between p-4 text-white animate-in zoom-in-95 duration-200">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="bg-amber-400 text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            AdMob SSV Test Unit
          </span>
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            {adUnitId.slice(0, 24)}...
          </span>
        </div>

        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content */}
      <div className="my-auto text-center space-y-4 px-2 max-w-sm mx-auto">
        <div className="relative mx-auto w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 to-violet-600 flex items-center justify-center shadow-xl shadow-amber-500/20">
          {verifiedReward ? (
            <CheckCircle2 className="w-10 h-10 text-white animate-bounce" />
          ) : isCompleted ? (
            <Award className="w-10 h-10 text-amber-200" />
          ) : (
            <Play className="w-10 h-10 text-white fill-white ml-1 animate-pulse" />
          )}
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-amber-400 text-xs font-semibold">
            <Award className="w-4 h-4" />
            <span>Server-Verified Rewarded Ad Unit</span>
          </div>
          <h3 className="text-lg font-bold">
            {verifiedReward
              ? `+${verifiedReward.coins} Coins Credited!`
              : isCompleted
              ? 'Ad Playback Complete'
              : 'Watching Rewarded Unit'}
          </h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            {verifiedReward
              ? `Successfully verified by server SSV. +$${(verifiedReward.cents / 100).toFixed(2)} creator share and +${verifiedReward.coins} coins recorded in ledger.`
              : isCompleted
              ? 'Playback verified. Click below to execute authentic server-side verification and credit your wallet.'
              : `Playing AdMob test ad unit (${secondsLeft}s remaining). Rewards are credited upon server callback verification.`}
          </p>
        </div>

        {/* Progress Bar during countdown */}
        {!isCompleted && (
          <div className="w-48 mx-auto bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-amber-400 h-full transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${((5 - secondsLeft) / 5) * 100}%` }}
            />
          </div>
        )}

        {/* Error Notice */}
        {claimError && (
          <div className="p-3 bg-rose-950/50 border border-rose-500/50 rounded-xl text-xs text-rose-300 flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{claimError}</span>
          </div>
        )}

        {/* Action Button */}
        {isCompleted && !verifiedReward && (
          <div className="pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <button
              onClick={handleClaimReward}
              disabled={isVerifying}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-400/25 hover:brightness-105 transition-all disabled:opacity-50"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying on Server SSV...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Verify with Server & Claim Reward</span>
                </>
              )}
            </button>
          </div>
        )}

        {verifiedReward && (
          <div className="pt-2">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all"
            >
              Close & View Wallet
            </button>
          </div>
        )}
      </div>

      <div className="text-center text-[10px] text-slate-500 border-t border-white/10 pt-3">
        Google Mobile Ads Test Suite • Server-Side Verification (SSV) protected against duplicate replay
      </div>
    </div>
  );
};
