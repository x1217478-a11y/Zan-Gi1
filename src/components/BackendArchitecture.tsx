import React from 'react';
import {
  ShieldCheck,
  Server,
  Database,
  Radio,
  Cpu,
  Coins,
  CheckCircle2,
  Clock,
  KeyRound,
  FileCheck
} from 'lucide-react';

export const BackendArchitecture: React.FC = () => {
  const integrationMilestones = [
    {
      title: 'Authentication & Profile Store',
      status: 'Ready for Connection',
      icon: KeyRound,
      desc: 'Token-based auth via Firebase Auth or OAuth 2.0 PKCE. Client repository interfaces are defined; passwords never stored plaintext.'
    },
    {
      title: 'Server-Side AI Gateway (Gemini 3.8 Flash)',
      status: 'Implemented & Active',
      icon: Cpu,
      desc: 'Full-stack Express server proxy (/api/ai/assistant) running @google/genai SDK. Zero client-side API key exposure.'
    },
    {
      title: 'Cloud Database & Posts Repository',
      status: 'Schema & Models Ready',
      icon: Database,
      desc: 'Structured models for User, Post, Comment, Story, and Creator Coins. Local demo repository ready for Cloud Firestore or Cloud SQL.'
    },
    {
      title: 'Real-Time Messaging & Live Audio Rooms',
      status: 'UI Tested • SFU Cluster Required',
      icon: Radio,
      desc: 'UI contracts for 1:1 chat and audio broadcast rooms. Production delivery requires WebRTC SFU signaling cluster (LiveKit or mediasoup).'
    },
    {
      title: 'Ads Mode & Monetization (AdMob)',
      status: 'Compliant Test Suite Ready',
      icon: Coins,
      desc: 'Configured with official Google test ad units. Banner, native cards, interstitial natural cooldowns, and rewarded coin grant callbacks.'
    }
  ];

  return (
    <div className="max-w-5xl w-full mx-auto p-4 space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-2">
        <div className="flex items-center gap-2">
          <Server className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-slate-900">
            Zan-Gi Backend Integration Plan & Security Matrix
          </h2>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Zan-Gi follows an uncompromising security-first architecture for 2026–2028: sensitive AI credentials, payment ledgers, and moderation rules are strictly isolated on server-side gateways.
        </p>
      </div>

      {/* Architecture Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrationMilestones.map((milestone) => {
          const Icon = milestone.icon;
          return (
            <div
              key={milestone.title}
              className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2.5 shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">{milestone.title}</h4>
                </div>
                <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                  {milestone.status}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {milestone.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Verified Feature Audit Table */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-emerald-600" />
          <span>Feature Verification Checklist (Tested vs Demo Mode)</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                <th className="pb-2">Capability</th>
                <th className="pb-2">Implementation Status</th>
                <th className="pb-2">Verification Scope</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="py-2.5 font-semibold">Jetpack Compose M3 UI</td>
                <td className="py-2.5 text-emerald-600 font-bold">✅ Verified Native Code</td>
                <td className="py-2.5 text-slate-500">Android 15 / API 35 baseline in /android/</td>
              </tr>
              <tr>
                <td className="py-2.5 font-semibold">Bengali & English AI Studio</td>
                <td className="py-2.5 text-emerald-600 font-bold">✅ Live Server Proxy</td>
                <td className="py-2.5 text-slate-500">gemini-3.8-flash with honest fallback</td>
              </tr>
              <tr>
                <td className="py-2.5 font-semibold">Google Mobile Ads (AdMob)</td>
                <td className="py-2.5 text-emerald-600 font-bold">✅ Compliant Test Suite</td>
                <td className="py-2.5 text-slate-500">Banner, Native, Interstitial, Rewarded</td>
              </tr>
              <tr>
                <td className="py-2.5 font-semibold">Smart Algorithmic Feed</td>
                <td className="py-2.5 text-blue-600 font-semibold">🟡 Local Demo Repository</td>
                <td className="py-2.5 text-slate-500">Clearly labeled demo data with reason explainer</td>
              </tr>
              <tr>
                <td className="py-2.5 font-semibold">Live Audio Creator Rooms</td>
                <td className="py-2.5 text-amber-600 font-semibold">🟡 UI Contract Ready</td>
                <td className="py-2.5 text-slate-500">Awaiting WebRTC cluster connection</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
