import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  Languages,
  CheckCircle2,
  Copy,
  RefreshCw,
  Video,
  Image as ImageIcon,
  AlertCircle,
  FileText,
  Hash,
  Clapperboard,
  ShieldAlert,
  ArrowRightLeft,
  Sliders,
  Check,
  Flame,
  Film
} from 'lucide-react';
import { AiChatMessage } from '../../types';

interface AiAssistantViewProps {
  isBengali: boolean;
  onLanguageToggle: () => void;
}

type AiTab = 'copilot' | 'polish' | 'translate' | 'script' | 'creator_studio';

export const AiAssistantView: React.FC<AiAssistantViewProps> = ({
  isBengali,
  onLanguageToggle,
}) => {
  const [activeTab, setActiveTab] = useState<AiTab>('copilot');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [apiNotice, setApiNotice] = useState<string | null>(null);

  // ----------------------------------------------------------------
  // TAB 1: Copilot Chat State
  // ----------------------------------------------------------------
  const [messages, setMessages] = useState<AiChatMessage[]>([
    {
      id: 'ai_init',
      sender: 'assistant',
      content: isBengali
        ? 'স্বাগতম Zan-Gi AI ক্রিয়েটর ইউনিভার্সে! 🌟\n\nআমি আপনাকে বাংলা ও ইংরেজি উভয় ভাষায় আকর্ষণীয় ক্যাপশন, হ্যাশট্যাগ বাছাই, শর্ট ভিডিওর স্ক্রিপ্ট লিখন এবং কনটেন্ট অনুবাদের কাজে সাহায্য করব। আজকের জন্য কী প্ল্যান করছেন?'
        : 'Welcome to Zan-Gi AI Creator Universe! 🌟\n\nI can draft engaging captions, curate high-reach hashtags, outline 60-second video scripts, and translate between Bengali and English. What are you building today?',
      timestamp: 'এখন',
      language: isBengali ? 'bn' : 'en',
      modelSignature: 'local-demo-engine',
      isDemoFallback: true,
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiStatus, setAiStatus] = useState<{ isConfigured: boolean; model: string } | null>(null);

  React.useEffect(() => {
    fetch('/api/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setAiStatus({
            isConfigured: Boolean(data.aiConfigured),
            model: data.model || 'local-demo-engine',
          });
          setMessages((prev) =>
            prev.map((m) =>
              m.id === 'ai_init'
                ? {
                    ...m,
                    modelSignature: data.model || (data.aiConfigured ? 'gemini-3.8-flash' : 'local-demo-engine'),
                    isDemoFallback: !data.aiConfigured,
                  }
                : m
            )
          );
        }
      })
      .catch(() => {});
  }, []);

  // ----------------------------------------------------------------
  // TAB 2: Caption Polisher State
  // ----------------------------------------------------------------
  const [polishInput, setPolishInput] = useState('');
  const [polishTone, setPolishTone] = useState<'concise' | 'friendly' | 'professional' | 'creative'>('creative');
  const [polishLang, setPolishLang] = useState<'bn' | 'en'>(isBengali ? 'bn' : 'en');
  const [polishOutput, setPolishOutput] = useState('');
  const [polishHashtags, setPolishHashtags] = useState<string[]>([]);
  const [isPolishing, setIsPolishing] = useState(false);
  const [polishError, setPolishError] = useState<string | null>(null);
  const [polishDisclaimer, setPolishDisclaimer] = useState<string | null>(null);

  // ----------------------------------------------------------------
  // TAB 3: Translator State
  // ----------------------------------------------------------------
  const [transInput, setTransInput] = useState('');
  const [transTarget, setTransTarget] = useState<'bn' | 'en'>(isBengali ? 'en' : 'bn');
  const [transOutput, setTransOutput] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [transError, setTransError] = useState<string | null>(null);

  // ----------------------------------------------------------------
  // TAB 4: Reels Script Generator State
  // ----------------------------------------------------------------
  const [scriptTopic, setScriptTopic] = useState('');
  const [scriptTone, setScriptTone] = useState<'friendly' | 'professional' | 'creative' | 'high_energy'>('creative');
  const [scriptLang, setScriptLang] = useState<'bn' | 'en'>(isBengali ? 'bn' : 'en');
  const [scriptDuration, setScriptDuration] = useState<number>(60);
  const [scriptResult, setScriptResult] = useState<{
    title: string;
    hook: string;
    visualHook: string;
    mainNarrative: string;
    visualMain: string;
    callToAction: string;
    hashtags: string[];
  } | null>(null);
  const [isScripting, setIsScripting] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ----------------------------------------------------------------
  // Handlers
  // ----------------------------------------------------------------
  const handleSendMessage = async (customPrompt?: string) => {
    const text = customPrompt || inputPrompt;
    if (!text.trim() || isGenerating) return;

    const userMsg: AiChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      content: text,
      timestamp: 'এইমাত্র',
      language: isBengali ? 'bn' : 'en',
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInputPrompt('');
    setIsGenerating(true);
    setApiNotice(null);

    try {
      const response = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          language: isBengali ? 'bn' : 'en',
          task: 'chat',
          tone: 'creative and helpful',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.configured) {
        const errorReply: AiChatMessage = {
          id: `ai_${Date.now()}`,
          sender: 'assistant',
          content: data.error || (isBengali
            ? '⚠️ জেমিনি এআই এপিআই কি কনফিগার করা নেই। লাইভ এআই এর জন্য সার্ভারে GEMINI_API_KEY সেট করুন।'
            : '⚠️ Gemini AI API key is not configured. Please set GEMINI_API_KEY in the server environment to enable live AI responses.'),
          timestamp: 'এইমাত্র',
          language: isBengali ? 'bn' : 'en',
          modelSignature: 'unconfigured',
          isDemoFallback: false,
        };
        setMessages((prev) => [...prev, errorReply]);
        if (data.disclaimer) {
          setApiNotice(data.disclaimer);
        }
        return;
      }

      const aiReply: AiChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'assistant',
        content: data.reply || 'No response returned from service.',
        timestamp: 'এইমাত্র',
        language: isBengali ? 'bn' : 'en',
        modelSignature: data.model || 'gemini-3.8-flash',
        isDemoFallback: false,
      };

      setMessages((prev) => [...prev, aiReply]);
      if (data.disclaimer) {
        setApiNotice(data.disclaimer);
      }
    } catch (err: any) {
      console.warn('AI endpoint error:', err);
      const errorReply: AiChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'assistant',
        content: isBengali
          ? `⚠️ এআই সার্ভিসের সাথে সংযোগ ব্যর্থ হয়েছে: ${err.message || 'নেটওয়ার্ক বা সার্ভার সমস্যা'}`
          : `⚠️ Failed to connect to AI service: ${err.message || 'Network or server communication error'}`,
        timestamp: 'এইমাত্র',
        language: isBengali ? 'bn' : 'en',
        modelSignature: 'error',
        isDemoFallback: false,
      };
      setMessages((prev) => [...prev, errorReply]);
      setApiNotice(isBengali ? 'এআই সার্ভিস সাময়িকভাবে অনুপলব্ধ।' : 'AI service is temporarily unavailable.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePolishCaption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!polishInput.trim() || isPolishing) return;

    setIsPolishing(true);
    setPolishError(null);
    setPolishDisclaimer(null);

    try {
      const res = await fetch('/api/ai/polish-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: polishInput,
          language: polishLang,
          tone: polishTone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPolishError(data.error || 'Failed to polish caption');
      } else {
        setPolishOutput(data.polishedText);
        setPolishHashtags(data.hashtags || []);
        if (data.disclaimer) setPolishDisclaimer(data.disclaimer);
      }
    } catch (e: any) {
      setPolishError(e.message || 'Network error while contacting AI engine');
    } finally {
      setIsPolishing(false);
    }
  };

  const handleTranslate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transInput.trim() || isTranslating) return;

    setIsTranslating(true);
    setTransError(null);

    try {
      const res = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: transInput,
          targetLang: transTarget,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTransError(data.error || 'Failed to translate content');
      } else {
        setTransOutput(data.translatedText);
      }
    } catch (e: any) {
      setTransError(e.message || 'Translation failed');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleGenerateScript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scriptTopic.trim() || isScripting) return;

    setIsScripting(true);
    setScriptError(null);

    try {
      const res = await fetch('/api/ai/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: scriptTopic,
          language: scriptLang,
          tone: scriptTone,
          durationSeconds: scriptDuration,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setScriptError(data.error || 'Failed to generate script');
      } else {
        setScriptResult(data.script);
      }
    } catch (e: any) {
      setScriptError(e.message || 'Script generation failed');
    } finally {
      setIsScripting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 select-none overflow-hidden w-full">
      {/* Top Header & Navigation Sub-Tabs */}
      <div className="bg-white border-b border-slate-100 p-3 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span>Zan-Gi AI Engine</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                  aiStatus?.isConfigured
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  {aiStatus?.isConfigured ? 'gemini-3.8-flash (Live)' : 'demo-rule-engine (Local)'}
                </span>
              </h3>
              <p className="text-[10px] text-slate-500">
                {isBengali ? 'বাংলা ও ইংরেজি সৃজনশীল সহকারী' : 'Bengali & English Creative Copilot'}
              </p>
            </div>
          </div>

          <button
            onClick={onLanguageToggle}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            <Languages className="w-3.5 h-3.5" />
            <span>{isBengali ? 'বাংলা' : 'EN'}</span>
          </button>
        </div>

        {/* Feature Sub-Tabs */}
        <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-100 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('copilot')}
            className={`text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${
              activeTab === 'copilot' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            💬 {isBengali ? 'সহকারী চ্যাট' : 'Copilot Chat'}
          </button>

          <button
            onClick={() => setActiveTab('polish')}
            className={`text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${
              activeTab === 'polish' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            ✨ {isBengali ? 'ক্যাপশন পলিশার' : 'Caption Polisher'}
          </button>

          <button
            onClick={() => setActiveTab('translate')}
            className={`text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${
              activeTab === 'translate' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            🌐 {isBengali ? 'অনুবাদ' : 'Translator'}
          </button>

          <button
            onClick={() => setActiveTab('script')}
            className={`text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${
              activeTab === 'script' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            🎬 {isBengali ? 'রিলস স্ক্রিপ্ট' : 'Reels Script'}
          </button>

          <button
            onClick={() => setActiveTab('creator_studio')}
            className={`text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${
              activeTab === 'creator_studio' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            🎨 {isBengali ? 'স্টুডিও টুলস' : 'Studio Tools'}
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: COPILOT CHAT                                          */}
      {/* ============================================================ */}
      {activeTab === 'copilot' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[90%] ${
                    isUser ? 'ml-auto' : 'mr-auto'
                  }`}
                >
                  <div
                    className={`rounded-2xl p-3 text-xs leading-relaxed whitespace-pre-wrap shadow-xs ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-br-xs'
                        : 'bg-white text-slate-900 border border-slate-150 rounded-bl-xs'
                    }`}
                  >
                    {!isUser && (
                      <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-slate-100 text-[10px] text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-violet-700 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-cyan-500" />
                            <span>Zan-Gi Copilot</span>
                          </span>
                          <span className="text-[9px] bg-slate-100 text-slate-700 font-mono px-1 py-0.2 rounded font-medium">
                            {msg.modelSignature || 'gemini-3.8-flash'}
                          </span>
                        </div>

                        <button
                          onClick={() => copyToClipboard(msg.content, msg.id)}
                          className="hover:text-slate-700 flex items-center gap-1"
                          title="Copy text"
                        >
                          {copiedId === msg.id ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    )}
                    {msg.content}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-0.5 px-1">{msg.timestamp}</span>
                </div>
              );
            })}

            {isGenerating && (
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-white border border-slate-100 rounded-xl p-2.5 w-fit">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>{isBengali ? 'Zan-Gi AI উত্তর তৈরি করছে...' : 'Zan-Gi AI is drafting response...'}</span>
              </div>
            )}
          </div>

          {/* Bottom Prompt Input */}
          <div className="p-3 bg-white border-t border-slate-100 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder={
                  isBengali
                    ? 'AI সহকারীকে প্রশ্ন করুন (ক্যাপশন, আইডিয়া, স্ক্রিপ্ট)...'
                    : 'Ask AI assistant for ideas, scripts, or translations...'
                }
                className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-xs text-slate-900 focus:outline-none focus:border-cyan-500 focus:bg-white transition-all"
              />
              <button
                type="submit"
                disabled={!inputPrompt.trim() || isGenerating}
                className="w-8 h-8 rounded-full bg-blue-600 disabled:opacity-40 text-white flex items-center justify-center shrink-0 hover:bg-blue-700 transition-colors shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: CAPTION POLISHER (PHASE 5 FEATURE A)                  */}
      {/* ============================================================ */}
      {activeTab === 'polish' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  {isBengali ? 'সোশ্যাল ক্যাপশন পলিশার' : 'Social Caption Polisher'}
                </h4>
                <p className="text-[11px] text-slate-500">
                  {isBengali ? 'খসড়া লেখাকে পরিমার্জিত ও আকর্ষণীয় সোশ্যাল রূপ দিন' : 'Enhance raw drafts into engaging social captions'}
                </p>
              </div>
            </div>

            <form onSubmit={handlePolishCaption} className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  {isBengali ? 'আপনার খসড়া ক্যাপশন' : 'Your Draft Caption'}
                </label>
                <textarea
                  rows={3}
                  value={polishInput}
                  onChange={(e) => setPolishInput(e.target.value)}
                  placeholder={
                    isBengali
                      ? 'উদাহরণ: আজকে নতুন টেকনোলজি নিয়ে কাজ করলাম অনেক ভালো লেগেছে...'
                      : 'Example: Built a new feature today feeling excited about creator tools...'
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-blue-500 focus:bg-white transition-all resize-none"
                  required
                />
              </div>

              {/* Tone & Language Selectors */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                    {isBengali ? 'কণ্ঠস্বর (Tone)' : 'Voice Tone'}
                  </label>
                  <select
                    value={polishTone}
                    onChange={(e: any) => setPolishTone(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="creative">{isBengali ? '🎨 সৃজনশীল (Creative)' : '🎨 Creative'}</option>
                    <option value="friendly">{isBengali ? '😊 আন্তরিক (Friendly)' : '😊 Friendly'}</option>
                    <option value="professional">{isBengali ? '💼 পেশাদার (Professional)' : '💼 Professional'}</option>
                    <option value="concise">{isBengali ? '⚡ সংক্ষিপ্ত (Concise)' : '⚡ Concise'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                    {isBengali ? 'টার্গেট ভাষা' : 'Target Language'}
                  </label>
                  <select
                    value={polishLang}
                    onChange={(e: any) => setPolishLang(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="bn">বাংলা (Bengali)</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>

              {polishError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{polishError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isPolishing || !polishInput.trim()}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                {isPolishing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{isBengali ? 'পলিশ করা হচ্ছে...' : 'Polishing with Gemini...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isBengali ? 'ক্যাপশন পলিশ করুন' : 'Polish Caption'}</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Polished Result Display */}
          {polishOutput && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs animate-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{isBengali ? 'পরিমার্জিত ক্যাপশন' : 'Polished Result'}</span>
                </span>
                <button
                  onClick={() =>
                    copyToClipboard(
                      `${polishOutput}\n\n${polishHashtags.join(' ')}`,
                      'copy_polish'
                    )
                  }
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedId === 'copy_polish' ? 'Copied!' : 'Copy All'}</span>
                </button>
              </div>

              <textarea
                rows={3}
                value={polishOutput}
                onChange={(e) => setPolishOutput(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 leading-relaxed font-sans resize-none"
              />

              {polishHashtags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {polishHashtags.map((h, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-[10px] font-medium"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              )}

              {polishDisclaimer && (
                <p className="text-[10px] text-slate-400 italic pt-1">{polishDisclaimer}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: BENGALI <-> ENGLISH TRANSLATOR (FEATURE B)            */}
      {/* ============================================================ */}
      {activeTab === 'translate' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Languages className="w-5 h-5 text-indigo-600" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    {isBengali ? 'বাংলা ⇄ ইংরেজি অনুবাদ' : 'Bengali ⇄ English Translator'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {isBengali ? 'ইউজারনেম ও হ্যাশট্যাগ অবিকৃত রেখে স্বাভাবিক ভাবানুবাদ' : 'Natural contextual translation preserving URLs & hashtags'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setTransTarget(transTarget === 'bn' ? 'en' : 'bn')}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1"
              >
                <ArrowRightLeft className="w-3 h-3" />
                <span>{transTarget === 'bn' ? 'To বাংলা' : 'To English'}</span>
              </button>
            </div>

            <form onSubmit={handleTranslate} className="space-y-3 pt-1">
              <textarea
                rows={3}
                value={transInput}
                onChange={(e) => setTransInput(e.target.value)}
                placeholder={
                  transTarget === 'bn'
                    ? 'Enter text in English to translate into Bengali...'
                    : 'অনুবাদ করার জন্য বাংলায় টেক্সট লিখুন...'
                }
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-blue-500 focus:bg-white transition-all resize-none"
                required
              />

              {transError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                  {transError}
                </div>
              )}

              <button
                type="submit"
                disabled={isTranslating || !transInput.trim()}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                {isTranslating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Translating...</span>
                  </>
                ) : (
                  <>
                    <Languages className="w-3.5 h-3.5" />
                    <span>{isBengali ? 'অনুবাদ সম্পন্ন করুন' : 'Translate Now'}</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {transOutput && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs animate-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">
                  {transTarget === 'bn' ? 'বাংলা অনুবাদ:' : 'English Translation:'}
                </span>
                <button
                  onClick={() => copyToClipboard(transOutput, 'copy_trans')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedId === 'copy_trans' ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>

              <textarea
                rows={3}
                value={transOutput}
                onChange={(e) => setTransOutput(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 leading-relaxed font-sans resize-none"
              />
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: REELS SCRIPT GENERATOR (FEATURE C)                    */}
      {/* ============================================================ */}
      {activeTab === 'script' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <Clapperboard className="w-5 h-5 text-violet-600" />
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  {isBengali ? 'শর্ট ভিডিও ও রিলস স্ক্রিপ্ট আর্কিটেক্ট' : 'Short Video & Reels Script Architect'}
                </h4>
                <p className="text-[11px] text-slate-500">
                  {isBengali ? 'হুক, ভিজ্যুয়াল ডিরেকশন ও কল-টু-অ্যাকশন সহ ৬০ সেকেন্ডের ভাইরাল স্ক্রিপ্ট' : 'Structured 3-part script: Hook [0-3s], Content [3-45s], CTA [45-60s]'}
                </p>
              </div>
            </div>

            <form onSubmit={handleGenerateScript} className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  {isBengali ? 'ভিডিওর বিষয় / আইডিয়া' : 'Video Topic / Core Theme'}
                </label>
                <input
                  type="text"
                  value={scriptTopic}
                  onChange={(e) => setScriptTopic(e.target.value)}
                  placeholder={
                    isBengali
                      ? 'যেমন: ঢাকায় ২০২৬ সালে AI দিয়ে কনটেন্ট তৈরি'
                      : 'e.g., 3 mistakes new creators make on short videos in 2026'
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-blue-500 focus:bg-white transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                    {isBengali ? 'ভাষা' : 'Language'}
                  </label>
                  <select
                    value={scriptLang}
                    onChange={(e: any) => setScriptLang(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="bn">বাংলা</option>
                    <option value="en">English</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                    {isBengali ? 'মুড / টোন' : 'Tone'}
                  </label>
                  <select
                    value={scriptTone}
                    onChange={(e: any) => setScriptTone(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="creative">Creative</option>
                    <option value="high_energy">High Energy</option>
                    <option value="professional">Educational</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                    {isBengali ? 'দৈর্ঘ্য' : 'Duration'}
                  </label>
                  <select
                    value={scriptDuration}
                    onChange={(e: any) => setScriptDuration(Number(e.target.value))}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value={30}>30 sec</option>
                    <option value={60}>60 sec</option>
                    <option value={90}>90 sec</option>
                  </select>
                </div>
              </div>

              {scriptError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                  {scriptError}
                </div>
              )}

              <button
                type="submit"
                disabled={isScripting || !scriptTopic.trim()}
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                {isScripting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Drafting Script...</span>
                  </>
                ) : (
                  <>
                    <Film className="w-3.5 h-3.5" />
                    <span>{isBengali ? 'স্ক্রিপ্ট তৈরি করুন' : 'Generate Reels Script'}</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Script Result Display */}
          {scriptResult && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3.5 shadow-2xs animate-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="font-extrabold text-xs text-slate-900">{scriptResult.title}</h4>
                <button
                  onClick={() =>
                    copyToClipboard(
                      `${scriptResult.title}\n\n${scriptResult.hook}\n${scriptResult.visualHook}\n\n${scriptResult.mainNarrative}\n${scriptResult.visualMain}\n\n${scriptResult.callToAction}\n\n${scriptResult.hashtags.join(' ')}`,
                      'copy_script'
                    )
                  }
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedId === 'copy_script' ? 'Copied!' : 'Copy Script'}</span>
                </button>
              </div>

              {/* 1. Hook */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                  <Flame className="w-3.5 h-3.5 text-amber-600" />
                  <span>{isBengali ? '১. হুক (০-৩ সেকেন্ড)' : '1. Spoken Hook (0-3s)'}</span>
                </div>
                <p className="text-slate-900 font-medium leading-relaxed">{scriptResult.hook}</p>
                <p className="text-[10px] text-amber-800 italic pt-0.5">
                  🎥 Visual direction: {scriptResult.visualHook}
                </p>
              </div>

              {/* 2. Main Narrative */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-blue-900 font-bold">
                  <Clapperboard className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isBengali ? '২. মূল দৃশ্য ও বক্তব্য (৩-৪৫ সেকেন্ড)' : '2. Core Narrative (3-45s)'}</span>
                </div>
                <p className="text-slate-900 leading-relaxed">{scriptResult.mainNarrative}</p>
                <p className="text-[10px] text-blue-800 italic pt-0.5">
                  🎥 B-Roll cues: {scriptResult.visualMain}
                </p>
              </div>

              {/* 3. Call to Action */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-900 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isBengali ? '৩. কল-টু-অ্যাকশন (৪৫-৬০ সেকেন্ড)' : '3. Call-To-Action (45-60s)'}</span>
                </div>
                <p className="text-slate-900 font-medium leading-relaxed">{scriptResult.callToAction}</p>
              </div>

              {/* Hashtags */}
              <div className="flex flex-wrap gap-1 pt-1">
                {scriptResult.hashtags.map((h, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-[10px] font-medium"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 5: CREATOR STUDIO TOOLS                                   */}
      {/* ============================================================ */}
      {activeTab === 'creator_studio' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Transparent Engineering Notice</p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Video rendering, automatic subtitle syncing, and generative image tools require connecting dedicated media rendering pipelines (e.g. FFmpeg microservices or Veo 3.1 endpoints). The tools below provide prompt preparation and draft templates.
              </p>
            </div>
          </div>

          {/* Subtitle Generator Draft */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>Automatic Bengali Subtitle Generator</span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                Prototype
              </span>
            </h4>
            <p className="text-xs text-slate-600">
              Generate formatted .SRT subtitle timestamps from your speech outline:
            </p>
            <div className="bg-slate-900 text-slate-200 font-mono text-[11px] p-3 rounded-xl leading-relaxed">
              1<br />
              00:00:01,000 --&gt; 00:00:04,500<br />
              স্বাগতম Zan-Gi ক্রিয়েটর স্টুডিওতে!<br /><br />
              2<br />
              00:00:04,500 --&gt; 00:00:08,200<br />
              Connect. Create. Imagine. Earn.
            </div>
          </div>

          {/* Thumbnail Suggestion */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-2">
            <h4 className="text-xs font-bold text-slate-900">Thumbnail & Visual Prompt Ideator</h4>
            <p className="text-xs text-slate-600">
              Optimal visual formula for Bangladeshi tech and creator feeds:
            </p>
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-700 space-y-1">
              <div>• <strong>Primary subject:</strong> Expressive close-up creator portrait with shallow depth of field</div>
              <div>• <strong>Lighting accent:</strong> Electric cyan & violet rim lighting</div>
              <div>• <strong>Aspect Ratio:</strong> 9:16 for Shorts / Reels, 4:3 for Smart Feed cards</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
