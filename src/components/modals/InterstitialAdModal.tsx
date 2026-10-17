import React, { useState, useEffect } from 'react';
import { X, ExternalLink, ShieldCheck } from 'lucide-react';

interface InterstitialAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  adUnitId: string;
}

export const InterstitialAdModal: React.FC<InterstitialAdModalProps> = ({
  isOpen,
  onClose,
  adUnitId
}) => {
  const [countdown, setCountdown] = useState(4);
  const [canClose, setCanClose] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(4);
      setCanClose(false);
      return;
    }

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanClose(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 bg-black/90 flex flex-col justify-between p-4 text-white animate-in fade-in duration-200">
      {/* Top Test Ad Banner Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="bg-amber-400 text-black text-[10px] font-bold px-2 py-0.5 rounded">
            TEST AD
          </span>
          <span className="text-xs text-slate-400 font-mono">
            {adUnitId.slice(0, 24)}...
          </span>
        </div>

        {canClose ? (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        ) : (
          <div className="text-xs bg-white/10 px-2.5 py-1 rounded-full text-slate-300">
            Skip in {countdown}s
          </div>
        )}
      </div>

      {/* Main Ad Mock Content */}
      <div className="text-center px-4 my-auto space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <ShieldCheck className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-bold tracking-tight">
          Zan-Gi Creator Economy 2026
        </h3>
        <p className="text-sm text-slate-300 max-w-xs mx-auto leading-relaxed">
          Google Mobile Ads SDK official interstitial test showcase. In production, interstitials trigger only at natural task boundaries.
        </p>
        <button
          onClick={onClose}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-slate-900 rounded-xl font-semibold text-xs hover:bg-slate-100 transition-colors shadow-md"
        >
          <span>Learn AdMob Guidelines</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Footer Disclaimer */}
      <div className="text-center text-[10px] text-slate-400 border-t border-white/10 pt-3">
        Official Google Test Unit • No live impressions generated
      </div>
    </div>
  );
};
