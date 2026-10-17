import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  X,
  Scale,
  FileText,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { CommunityRule } from '../../types';
import { useTheme } from '../../context/ThemeContext';

interface CommunityStandardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isBengali: boolean;
}

export const CommunityStandardsModal: React.FC<CommunityStandardsModalProps> = ({
  isOpen,
  onClose,
  isBengali,
}) => {
  const { isDark } = useTheme();
  const [rules, setRules] = useState<CommunityRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'standards' | 'monetization_policy' | 'enforcement'>('standards');

  useEffect(() => {
    if (!isOpen) return;
    const fetchRules = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/community-standards');
        if (res.ok) {
          const data = await res.json();
          if (data.standards && Array.isArray(data.standards)) {
            setRules(data.standards);
          }
        }
      } catch (err) {
        console.warn('Failed to load community standards:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRules();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-2xl max-h-[90vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden transition-colors ${
          isDark
            ? 'bg-slate-950 border-slate-800 text-slate-100 shadow-cyan-950/20'
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-200'
        }`}
      >
        {/* Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between shrink-0 ${
          isDark ? 'border-slate-800/80 bg-slate-900/40' : 'border-slate-100 bg-slate-50/80'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                {isBengali ? 'কমিউনিটি স্ট্যান্ডার্ড ও নীতিমালা' : 'Community Standards & Policies'}
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">
                {isBengali ? 'নিরাপদ, সৃজনশীল ও বিশ্বস্ত Zan-Gi সমাজ গড়ার নিয়মাবলী' : 'Safe, creative and trustworthy Zan-Gi platform rules'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-all ${
              isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className={`flex border-b text-xs font-bold px-4 shrink-0 ${
          isDark ? 'border-slate-800/80 bg-slate-950' : 'border-slate-100 bg-white'
        }`}>
          <button
            onClick={() => setActiveTab('standards')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'standards'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isBengali ? 'কমিউনিটি রুলস' : 'Community Rules'}</span>
          </button>
          <button
            onClick={() => setActiveTab('monetization_policy')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'monetization_policy'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{isBengali ? 'মনিটাইজেশন নীতিমালা' : 'Monetization Policy'}</span>
          </button>
          <button
            onClick={() => setActiveTab('enforcement')}
            className={`py-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'enforcement'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{isBengali ? 'শাস্তি ও আপিল প্রক্রিয়া' : 'Enforcement & Appeals'}</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
          {activeTab === 'standards' && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-300 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  {isBengali ? 'সব ব্যবহারকারীর জন্য প্রযোজ্য' : 'Universal Principles'}
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {isBengali
                    ? 'Zan-Gi প্ল্যাটফর্মে প্রতিটি ব্যবহারকারী, ক্রিয়েটর ও বিজ্ঞাপনী অংশীদারের নিরাপত্তা ও মর্যাদা বজায় রাখা আমাদের অগ্রাধিকার। কোনো নিয়ম লঙ্ঘন করলে স্বয়ংক্রিয় ও মানব পর্যালোচনার মাধ্যমে ব্যবস্থা নেওয়া হয়।'
                    : 'Maintaining safety and dignity on Zan-Gi is our highest priority. All violations are subject to AI-assisted and human moderator review.'}
                </p>
              </div>

              {loading ? (
                <div className="p-8 text-center text-slate-400">Loading Community Rules...</div>
              ) : (
                rules.map((rule, idx) => {
                  const isExpanded = expandedRule === rule.id;
                  return (
                    <div
                      key={rule.id}
                      className={`rounded-2xl border transition-all ${
                        isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-50/50'
                      }`}
                    >
                      <button
                        onClick={() => setExpandedRule(isExpanded ? null : rule.id)}
                        className="w-full p-3.5 text-left flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                            {idx + 1}
                          </span>
                          <div>
                            <h4 className="font-bold text-sm">
                              {isBengali ? rule.titleBn : rule.titleEn}
                            </h4>
                            <span
                              className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded ${
                                rule.severity === 'critical'
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : rule.severity === 'high'
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-blue-500/20 text-blue-300'
                              }`}
                            >
                              Severity: {rule.severity}
                            </span>
                          </div>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 space-y-2.5 border-t border-slate-800/40 text-slate-300">
                          <p className="leading-relaxed">
                            {isBengali ? rule.descriptionBn : rule.descriptionEn}
                          </p>
                          <div>
                            <span className="font-bold text-[11px] text-slate-200">
                              {isBengali ? 'নিষিদ্ধ আচরণের উদাহরণ:' : 'Prohibited Behaviors:'}
                            </span>
                            <ul className="list-disc list-inside space-y-1 mt-1 text-slate-400">
                              {rule.prohibitedBehaviors.map((beh, bIdx) => (
                                <li key={bIdx}>{beh}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'monetization_policy' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2">
                <h4 className="font-bold text-amber-300 text-sm flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-400" />
                  {isBengali ? 'মনিটাইজেশন ও বিজ্ঞাপনী সততা নীতিমালা' : 'Monetization & Ad Integrity Policy'}
                </h4>
                <p className="text-slate-300 leading-relaxed">
                  {isBengali
                    ? 'Zan-Gi ক্রিয়েটর ইকোনমি সম্পূর্ণ বিশ্বস্ত ও স্বচ্ছ রাজস্ব বণ্টনের উপর প্রতিষ্ঠিত। কৃত্রিম ভিউ, ক্লিক ফার্মিং বা ইনসেন্টিভাইজড ক্লিক সম্পূর্ণ নিষিদ্ধ।'
                    : 'The Zan-Gi Creator Economy relies on authentic traffic and transparent revenue allocation. Artificial impressions, reward farming, or click fraud are strictly prohibited.'}
                </p>
              </div>

              <div className={`p-4 rounded-2xl border space-y-3 ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white'}`}>
                <h5 className="font-bold text-sm text-cyan-400">
                  {isBengali ? '১. যোগ্যতা অর্জন ও অ্যাকাউন্ট শর্তাবলী' : '1. Eligibility & Requirements'}
                </h5>
                <ul className="space-y-1.5 text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>{isBengali ? 'কমপক্ষে ১,০০০ সক্রিয় অনুসারী' : 'Minimum 1,000 active followers'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>{isBengali ? 'অ্যাকাউন্টের বয়স ন্যূনতম ৩০ দিন' : 'Account age at least 30 days old'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>{isBengali ? 'যাচাইকৃত ইমেইল ও সক্রিয় টু-ফ্যাক্টর নিরাপত্তা' : 'Verified email address & active 2FA security'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>{isBengali ? 'কমিউনিটি স্ট্যান্ডার্ডে জিরো অ্যাক্টিভ স্ট্রাইক' : 'Zero active community guideline strikes'}</span>
                  </li>
                </ul>
              </div>

              <div className={`p-4 rounded-2xl border space-y-2 ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white'}`}>
                <h5 className="font-bold text-sm text-indigo-400">
                  {isBengali ? '২. ৭০/৩০ রাজস্ব বণ্টন ও ২% ভ্যাট হিসাব' : '2. 70/30 Revenue Split & 2% VAT Accounting'}
                </h5>
                <p className="text-slate-300 leading-relaxed">
                  {isBengali
                    ? 'বিজ্ঞাপন রাজস্বের মোট বিভাজ্য অংশের ৭০% সরাসরি ক্রিয়েটরের এবং ৩০% Zan-Gi প্ল্যাটফর্মের। প্ল্যাটফর্মের ৩০% সেবার উপর ২% সরকারি ভ্যাট নির্ধারিত খাতে সংরক্ষিত হয় — কোনো অবস্থাতেই ক্রিয়েটর অংশ থেকে অতিরিক্ত অর্থ কাটা হয় না।'
                    : '70% of distributable net ad yield is credited directly to the Creator, and 30% to Zan-Gi Platform. A separate 2% statutory VAT applies to the platform service base. The creator and platform shares total exactly 100% of distributable pool.'}
                </p>
              </div>

              <div className={`p-4 rounded-2xl border space-y-2 ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white'}`}>
                <h5 className="font-bold text-sm text-rose-400">
                  {isBengali ? '৩. ইনভ্যালিড ট্রাফিক ও বিজ্ঞাপনে ক্লিক নিষেধাজ্ঞা' : '3. Invalid Traffic & No-Click-Incentives'}
                </h5>
                <p className="text-slate-300 leading-relaxed">
                  {isBengali
                    ? 'ব্যবহারকারীকে বিজ্ঞাপনে ক্লিক করতে উৎসাহিত করা AdMob ও Zan-Gi নীতিমালার সুস্পষ্ট লঙ্ঘন। শুধুমাত্র সম্পূর্ণ ভিডিও দেখার সার্ভার-যাচাইকৃত রিওয়ার্ড প্রদান করা হয়।'
                    : 'Users must never be instructed or encouraged to click ads. Only verified video completions are rewarded under strict server-side verification (SSV).'}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'enforcement' && (
            <div className="space-y-4">
              <div className="space-y-3">
                <h4 className="font-bold text-sm">
                  {isBengali ? 'ন্যায্য ও আনুপাতিক শাস্তি প্রক্রিয়া' : 'Proportionate Enforcement Spectrum'}
                </h4>
                <div className="space-y-2">
                  <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-500/10 flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-blue-500/30 text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">1</span>
                    <div>
                      <span className="font-bold text-blue-200">{isBengali ? 'শিক্ষামূলক সতর্কবার্তা' : 'Educational Notice'}</span>
                      <p className="text-[11px] text-slate-300">{isBengali ? 'ছোটখাটো অসাবধানতাবশত প্রথম ভুলের ক্ষেত্রে অ্যাকাউন্টে নোটিশ প্রদান।' : 'For minor first-time infractions with low severity.'}</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-amber-500/30 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">2</span>
                    <div>
                      <span className="font-bold text-amber-200">{isBengali ? 'পোস্ট অপসারণ ও সাময়িক নিষেধাজ্ঞা' : 'Content Removal & Feature Limit'}</span>
                      <p className="text-[11px] text-slate-300">{isBengali ? 'নির্দিষ্ট ক্ষতিকর পোস্ট ডিলিট এবং ২৪-৭২ ঘণ্টার পোস্ট স্থগিতাদেশ।' : 'Targeted content deleted and posting features restricted for 24-72 hours.'}</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-rose-500/30 text-rose-300 flex items-center justify-center font-bold text-xs shrink-0">3</span>
                    <div>
                      <span className="font-bold text-rose-200">{isBengali ? 'অ্যাকাউন্ট স্থগিত ও স্থায়ী বাতিল' : 'Account Suspension & Permanent Revocation'}</span>
                      <p className="text-[11px] text-slate-300">{isBengali ? 'মারাত্মক সহিংসতা, শিশু সুরক্ষা লঙ্ঘন বা প্রতারণামূলক কর্মকাণ্ডে স্থায়ী বাতিল।' : 'Severe violations, fraud, or repeat offenses subject to human review.'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-2xl border space-y-2 ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white'}`}>
                <h5 className="font-bold text-sm text-cyan-400">
                  {isBengali ? 'আপিল ও মানব পর্যালোচনার অধিকার' : 'Right to Appeal & Human Review'}
                </h5>
                <p className="text-slate-300 leading-relaxed">
                  {isBengali
                    ? 'কোনো সিদ্ধান্ত ভুল বলে মনে হলে যেকোনো ব্যবহারকারী নোটিফিকেশন থেকে সরাসরি আপিল করতে পারেন। আপিল আবেদনকারী নিরপেক্ষ মানব পর্যালোচকের দ্বারা পুনর্মূল্যায়ন পাবেন।'
                    : 'Users have the unequivocal right to appeal any automated or manual enforcement action. Appeals are reviewed by dedicated platform human operators.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t flex items-center justify-between shrink-0 ${
          isDark ? 'border-slate-800/80 bg-slate-950' : 'border-slate-100 bg-slate-50'
        }`}>
          <span className="text-[11px] text-slate-400">
            {isBengali ? 'সর্বশেষ সংস্করণ: অক্টোবর ২০২৬' : 'Last updated: October 2026'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white font-bold rounded-xl text-xs transition-all shadow-md"
          >
            {isBengali ? 'বুঝেছি' : 'I Understand'}
          </button>
        </div>
      </div>
    </div>
  );
};
