import { GoogleGenAI } from '@google/genai';
import { addAuditLog, findUserById } from './authService.js';

export interface AiRequestOptions {
  userId?: string;
  ip: string;
}

export interface PolishCaptionParams {
  text: string;
  language?: 'bn' | 'en';
  tone?: 'concise' | 'friendly' | 'professional' | 'creative';
}

export interface TranslateParams {
  text: string;
  sourceLang?: 'auto' | 'bn' | 'en';
  targetLang?: 'bn' | 'en';
}

export interface GenerateScriptParams {
  topic: string;
  language?: 'bn' | 'en';
  tone?: 'friendly' | 'professional' | 'creative' | 'high_energy';
  durationSeconds?: number;
}

export interface AiMetrics {
  totalRequests: number;
  successCount: number;
  errorCount: number;
  fallbackCount: number;
  rateLimitedCount: number;
  estimatedTokensUsed: number;
  recentEvents: Array<{
    id: string;
    task: string;
    status: 'success' | 'fallback' | 'rate_limited' | 'error';
    latencyMs: number;
    timestamp: string;
    ipSnippet: string;
    isLiveGemini: boolean;
  }>;
}

export interface AiConfig {
  rateLimitPerUserPerMin: number;
  rateLimitPerIpPerMin: number;
  maxCharLength: number;
  isLiveApiEnabled: boolean;
  globalDailyBudget: number;
}

// Config State
let aiConfig: AiConfig = {
  rateLimitPerUserPerMin: 20,
  rateLimitPerIpPerMin: 30,
  maxCharLength: 3000,
  isLiveApiEnabled: true,
  globalDailyBudget: 10000,
};

// Metrics State
const aiMetrics: AiMetrics = {
  totalRequests: 0,
  successCount: 0,
  errorCount: 0,
  fallbackCount: 0,
  rateLimitedCount: 0,
  estimatedTokensUsed: 0,
  recentEvents: [],
};

// Rate limiting state: key -> timestamp array
const ipRateBuckets: Map<string, number[]> = new Map();
const userRateBuckets: Map<string, number[]> = new Map();

// Deduplication cache: hash -> { result, expiresAt }
const queryCache: Map<string, { result: any; expiresAt: number }> = new Map();

function checkRateLimit(ip: string, userId?: string): { allowed: boolean; reason?: string; isPremium?: boolean } {
  const now = Date.now();
  const oneMinAgo = now - 60 * 1000;

  // 1. IP check
  const ipHits = (ipRateBuckets.get(ip) || []).filter((t) => t > oneMinAgo);
  if (ipHits.length >= aiConfig.rateLimitPerIpPerMin) {
    aiMetrics.rateLimitedCount++;
    return { allowed: false, reason: 'Too many AI requests from your IP. Please wait a minute.' };
  }
  ipHits.push(now);
  ipRateBuckets.set(ip, ipHits);

  // 2. User check with +20% Premium entitlement boost
  let isPremium = false;
  if (userId) {
    const user = findUserById(userId);
    isPremium = Boolean(user?.isPremium || user?.role === 'owner');
    // Allow 20% more eligible usage for Premium users when financially sustainable
    const userLimit = isPremium
      ? Math.floor(aiConfig.rateLimitPerUserPerMin * 1.2)
      : aiConfig.rateLimitPerUserPerMin;

    const userHits = (userRateBuckets.get(userId) || []).filter((t) => t > oneMinAgo);
    if (userHits.length >= userLimit) {
      aiMetrics.rateLimitedCount++;
      return {
        allowed: false,
        reason: `AI rate limit exceeded for your account (${userLimit}/min). Please wait a minute.`,
        isPremium,
      };
    }
    userHits.push(now);
    userRateBuckets.set(userId, userHits);
  }

  return { allowed: true, isPremium };
}

function recordAiEvent(
  task: string,
  status: 'success' | 'fallback' | 'rate_limited' | 'error',
  latencyMs: number,
  ip: string,
  isLive: boolean
) {
  aiMetrics.totalRequests++;
  if (status === 'success') aiMetrics.successCount++;
  if (status === 'fallback') aiMetrics.fallbackCount++;
  if (status === 'error') aiMetrics.errorCount++;

  const ipSnippet = ip ? ip.substring(0, Math.min(ip.length, 7)) + '...' : '127.0.*';
  aiMetrics.recentEvents.unshift({
    id: `ai_ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    task,
    status,
    latencyMs,
    timestamp: new Date().toISOString(),
    ipSnippet,
    isLiveGemini: isLive,
  });

  if (aiMetrics.recentEvents.length > 50) {
    aiMetrics.recentEvents.pop();
  }
}

// Initialize Gemini Client
let genAIClient: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;
if (apiKey && apiKey.trim() && apiKey !== 'MY_GEMINI_API_KEY') {
  try {
    genAIClient = new GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-zangi',
        },
      },
    });
    console.log('[AI Engine] Initialized GoogleGenAI with model gemini-3.8-flash.');
  } catch (err) {
    console.warn('[AI Engine] Failed to initialize GoogleGenAI client:', err);
  }
}

// ----------------------------------------------------
// Fallback Generators for Demo/Offline Operation
// ----------------------------------------------------
function getFallbackPolish(text: string, language: 'bn' | 'en', tone: string): { polished: string; hashtags: string[] } {
  const isBn = language === 'bn' || /[\u0980-\u09FF]/.test(text);

  if (isBn) {
    const tonePrefix =
      tone === 'professional'
        ? '📢 পেশাদার দৃষ্টিভঙ্গি: '
        : tone === 'creative'
          ? '🎨 সৃজনশীল উপস্থাপনা: '
          : tone === 'concise'
            ? '⚡ সংক্ষেপে: '
            : '✨ আন্তরিক বার্তা: ';

    return {
      polished: `${tonePrefix}${text.trim()}। Zan-Gi AI এর সাহায্যে পরিমার্জিত এবং ক্রিয়েটর ফিডের উপযোগী করা হয়েছে। 🚀`,
      hashtags: ['#ZanGi', '#বাংলাক্রিয়েটর', '#ক্রিয়েটরইকোনমি', '#ঢাকাভাইবস', '#AI2026'],
    };
  } else {
    const tonePrefix =
      tone === 'professional'
        ? '📢 Strategic Insight: '
        : tone === 'creative'
          ? '🎨 Creative Spark: '
          : tone === 'concise'
            ? '⚡ Quick Take: '
            : '✨ Friendly Pulse: ';

    return {
      polished: `${tonePrefix}${text.trim()}. Polished with Zan-Gi AI Engine for maximum creator reach and engagement. 🚀`,
      hashtags: ['#ZanGi', '#CreatorEconomy', '#SocialUniverse', '#GenAI2026', '#BuildInPublic'],
    };
  }
}

function getFallbackTranslation(text: string, targetLang: 'bn' | 'en'): string {
  if (targetLang === 'bn') {
    return `[বাংলা ভাবানুবাদ]: "${text}" — Zan-Gi প্ল্যাটফর্মে এআই ও ক্রিয়েটরদের মেলবন্ধন।`;
  }
  return `[English Translation]: "${text}" — Empowering creators across Zan-Gi AI Universe with high reach and fair monetization.`;
}

function getFallbackScript(topic: string, language: 'bn' | 'en', durationSeconds: number = 60) {
  const isBn = language === 'bn' || /[\u0980-\u09FF]/.test(topic);

  if (isBn) {
    return {
      title: `${topic} — ৬০ সেকেন্ডের ভাইরাল রিলস স্ক্রিপ্ট`,
      hook: `🎬 [০-৩ সে]: "আপনি কি জানেন কিভাবে ২০২৬ সালে '${topic}' দিয়ে ক্রিয়েটররা নিজেদের অডিয়েন্স দ্বিগুণ করছে?"`,
      visualHook: 'ক্যামেরা ক্লোজ-আপ, দ্রুত হ্যান্ড-জেসচার ও ইলেকট্রিক সায়ান রিম লাইট।',
      mainNarrative: `🗣️ [৩-৪৫ সে]: "${topic} নিয়ে কাজ করার সময় বেশিরভাগ মানুষ সাধারণ ভুলটি করে। আসল বিষয় হলো গভীর কমিউনিটি কানেকশন ও Zan-Gi স্মার্ট ফিডের সুবিধা নেওয়া।"`,
      visualMain: 'স্ক্রিন ক্যাপচার বা ক্রিয়েটর স্টুডিওর ড্যাশবোর্ড স্ক্রল, দ্রুত কাট।',
      callToAction: `🚀 [৪৫-৬০ সে]: "আপনার মতামত কমেন্টে জানান এবং পরবর্তী আপডেটের জন্য প্রোফাইলটি ফলো করে রাখুন!"`,
      hashtags: ['#ZanGiReels', '#বাংলাভিডিও', '#শর্টস২০২৬', '#ক্রিয়েটরটিপস'],
    };
  }

  return {
    title: `${topic} — 60s High-Conversion Reels Script`,
    hook: `🎬 [0-3s]: "Stop doing '${topic}' the old way. Here is the exact 2026 creator framework that actually scales."`,
    visualHook: 'Tight camera framing with vibrant ambient cyan/purple lighting and dynamic text pop-up.',
    mainNarrative: `🗣️ [3-45s]: "When approaching ${topic}, focus on authentic audience feedback loops and transparent monetization instead of vanity metrics."`,
    visualMain: 'Quick cut b-roll of Zan-Gi creator studio and audience graph metrics.',
    callToAction: `🚀 [45-60s]: "Drop your take in the replies and follow my Zan-Gi profile for the next breakdown!"`,
    hashtags: ['#ZanGiReels', '#ShortVideoScript', '#CreatorBlueprint', '#Growth2026'],
  };
}

// ----------------------------------------------------
// Core AI Service Implementations
// ----------------------------------------------------

export async function polishCaptionService(
  params: PolishCaptionParams,
  opts: AiRequestOptions
): Promise<{
  polishedText: string;
  hashtags: string[];
  isLiveGemini: boolean;
  model: string;
  disclaimer: string;
}> {
  const startTime = Date.now();
  const { text, language = 'bn', tone = 'creative' } = params;

  if (!text || !text.trim()) {
    throw new Error('Caption text is required for polishing.');
  }
  if (text.length > aiConfig.maxCharLength) {
    throw new Error(`Text exceeds maximum allowed length of ${aiConfig.maxCharLength} characters.`);
  }

  const rateCheck = checkRateLimit(opts.ip, opts.userId);
  if (!rateCheck.allowed) {
    recordAiEvent('caption_polisher', 'rate_limited', Date.now() - startTime, opts.ip, false);
    throw new Error(rateCheck.reason);
  }

  // Deduplication cache check
  const cacheKey = `polish_${language}_${tone}_${text.trim().toLowerCase()}`;
  const cached = queryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  // If live Gemini is unavailable or disabled, use honest fallback
  if (!genAIClient || !aiConfig.isLiveApiEnabled) {
    const fallback = getFallbackPolish(text, language, tone);
    recordAiEvent('caption_polisher', 'fallback', Date.now() - startTime, opts.ip, false);
    const result = {
      polishedText: fallback.polished,
      hashtags: fallback.hashtags,
      isLiveGemini: false,
      model: 'local-demo-engine',
      disclaimer: 'Operating in demo rule-based engine. Add GEMINI_API_KEY in environment to unlock live Gemini 3.8 Flash.',
    };
    queryCache.set(cacheKey, { result, expiresAt: Date.now() + 5 * 60 * 1000 });
    return result;
  }

  try {
    const prompt = `You are Zan-Gi AI Caption Polisher for a social media app.
Target Language: ${language === 'bn' ? 'Bengali (বাংলা)' : 'English'}.
Desired Tone: ${tone}.
Original Caption: "${text}"

Instructions:
1. Polish the caption to be engaging, natural, and culturally resonant. Keep the user's authentic voice.
2. Provide 4 to 8 relevant trending hashtags.
3. Return clean JSON in this format:
{
  "polished": "string",
  "hashtags": ["#tag1", "#tag2"]
}`;

    const response = await genAIClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const rawText = response.text || '{}';
    let parsed: any = {};
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = { polished: rawText, hashtags: ['#ZanGi', '#Creator'] };
    }

    aiMetrics.estimatedTokensUsed += 250;
    recordAiEvent('caption_polisher', 'success', Date.now() - startTime, opts.ip, true);

    const result = {
      polishedText: parsed.polished || text,
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : ['#ZanGi'],
      isLiveGemini: true,
      model: 'gemini-3.8-flash',
      disclaimer: 'Live AI response generated via server-side Gemini 3.8 Flash proxy.',
    };

    queryCache.set(cacheKey, { result, expiresAt: Date.now() + 5 * 60 * 1000 });
    return result;
  } catch (err: any) {
    console.warn('[AI Engine] Live Gemini call failed, falling back:', err.message);
    const fallback = getFallbackPolish(text, language, tone);
    recordAiEvent('caption_polisher', 'fallback', Date.now() - startTime, opts.ip, false);
    return {
      polishedText: fallback.polished,
      hashtags: fallback.hashtags,
      isLiveGemini: false,
      model: 'local-fallback',
      disclaimer: `Gemini API temporary notice (${err.message || 'Service busy'}). Fallback engine activated.`,
    };
  }
}

export async function translateContentService(
  params: TranslateParams,
  opts: AiRequestOptions
): Promise<{
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  isLiveGemini: boolean;
  model: string;
  disclaimer: string;
}> {
  const startTime = Date.now();
  const { text, targetLang = 'bn' } = params;

  if (!text || !text.trim()) {
    throw new Error('Text to translate is required.');
  }

  const rateCheck = checkRateLimit(opts.ip, opts.userId);
  if (!rateCheck.allowed) {
    recordAiEvent('translate', 'rate_limited', Date.now() - startTime, opts.ip, false);
    throw new Error(rateCheck.reason);
  }

  const detectedSource = /[\u0980-\u09FF]/.test(text) ? 'bn' : 'en';
  const finalTarget = targetLang === detectedSource ? (detectedSource === 'bn' ? 'en' : 'bn') : targetLang;

  const cacheKey = `trans_${finalTarget}_${text.trim().toLowerCase()}`;
  const cached = queryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  if (!genAIClient || !aiConfig.isLiveApiEnabled) {
    const fallback = getFallbackTranslation(text, finalTarget);
    recordAiEvent('translate', 'fallback', Date.now() - startTime, opts.ip, false);
    const result = {
      translatedText: fallback,
      sourceLang: detectedSource,
      targetLang: finalTarget,
      isLiveGemini: false,
      model: 'local-demo-engine',
      disclaimer: 'Operating in demo mode. Connect GEMINI_API_KEY in Secrets for live translation.',
    };
    queryCache.set(cacheKey, { result, expiresAt: Date.now() + 5 * 60 * 1000 });
    return result;
  }

  try {
    const prompt = `Translate the following social media text from ${detectedSource === 'bn' ? 'Bengali' : 'English'} to ${finalTarget === 'bn' ? 'Bengali' : 'English'}.
Preserve usernames, URLs, hashtags, punctuation, and formatting. Output only the translated text without extra explanation.
Original Text: "${text}"`;

    const response = await genAIClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    aiMetrics.estimatedTokensUsed += 150;
    recordAiEvent('translate', 'success', Date.now() - startTime, opts.ip, true);

    const result = {
      translatedText: (response.text || '').trim() || text,
      sourceLang: detectedSource,
      targetLang: finalTarget,
      isLiveGemini: true,
      model: 'gemini-3.8-flash',
      disclaimer: 'Live translation generated via Gemini 3.8 Flash.',
    };

    queryCache.set(cacheKey, { result, expiresAt: Date.now() + 5 * 60 * 1000 });
    return result;
  } catch (err: any) {
    console.warn('[AI Engine] Translation failed, fallback:', err.message);
    const fallback = getFallbackTranslation(text, finalTarget);
    recordAiEvent('translate', 'fallback', Date.now() - startTime, opts.ip, false);
    return {
      translatedText: fallback,
      sourceLang: detectedSource,
      targetLang: finalTarget,
      isLiveGemini: false,
      model: 'local-fallback',
      disclaimer: `Translation fallback active: ${err.message || 'Service busy'}`,
    };
  }
}

export async function generateScriptService(
  params: GenerateScriptParams,
  opts: AiRequestOptions
): Promise<{
  script: {
    title: string;
    hook: string;
    visualHook: string;
    mainNarrative: string;
    visualMain: string;
    callToAction: string;
    hashtags: string[];
  };
  isLiveGemini: boolean;
  model: string;
  disclaimer: string;
}> {
  const startTime = Date.now();
  const { topic, language = 'bn', tone = 'creative', durationSeconds = 60 } = params;

  if (!topic || !topic.trim()) {
    throw new Error('Topic is required to generate video script.');
  }

  const rateCheck = checkRateLimit(opts.ip, opts.userId);
  if (!rateCheck.allowed) {
    recordAiEvent('script_generator', 'rate_limited', Date.now() - startTime, opts.ip, false);
    throw new Error(rateCheck.reason);
  }

  const cacheKey = `script_${language}_${tone}_${topic.trim().toLowerCase()}`;
  const cached = queryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  if (!genAIClient || !aiConfig.isLiveApiEnabled) {
    const fallback = getFallbackScript(topic, language, durationSeconds);
    recordAiEvent('script_generator', 'fallback', Date.now() - startTime, opts.ip, false);
    const result = {
      script: fallback,
      isLiveGemini: false,
      model: 'local-demo-engine',
      disclaimer: 'Generated via offline creator template engine. Connect GEMINI_API_KEY for custom AI scripts.',
    };
    queryCache.set(cacheKey, { result, expiresAt: Date.now() + 5 * 60 * 1000 });
    return result;
  }

  try {
    const prompt = `You are Zan-Gi AI Video Script Architect.
Language: ${language === 'bn' ? 'Bengali (বাংলা)' : 'English'}.
Tone: ${tone}.
Topic: "${topic}".
Duration: ${durationSeconds} seconds short-form video (Reels/Shorts).

Generate a structured 3-part script with visual cues in valid JSON:
{
  "title": "Short catchy title",
  "hook": "0-3s high impact spoken hook",
  "visualHook": "Camera framing and lighting instruction for hook",
  "mainNarrative": "3-45s body narrative",
  "visualMain": "Visual changes, b-roll, or graphics directions",
  "callToAction": "45-60s call to action asking followers to engage on Zan-Gi",
  "hashtags": ["#tag1", "#tag2", "#tag3"]
}`;

    const response = await genAIClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    aiMetrics.estimatedTokensUsed += 450;
    recordAiEvent('script_generator', 'success', Date.now() - startTime, opts.ip, true);

    const result = {
      script: {
        title: parsed.title || topic,
        hook: parsed.hook || 'Watch this before your next project!',
        visualHook: parsed.visualHook || 'Eye-level portrait framing.',
        mainNarrative: parsed.mainNarrative || 'Here is the key breakdown.',
        visualMain: parsed.visualMain || 'Dynamic text callouts on screen.',
        callToAction: parsed.callToAction || 'Follow my Zan-Gi profile for more!',
        hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : ['#ZanGiReels'],
      },
      isLiveGemini: true,
      model: 'gemini-3.8-flash',
      disclaimer: 'Live script generated with Gemini 3.8 Flash.',
    };

    queryCache.set(cacheKey, { result, expiresAt: Date.now() + 5 * 60 * 1000 });
    return result;
  } catch (err: any) {
    console.warn('[AI Engine] Script generation failed, fallback:', err.message);
    const fallback = getFallbackScript(topic, language, durationSeconds);
    recordAiEvent('script_generator', 'fallback', Date.now() - startTime, opts.ip, false);
    return {
      script: fallback,
      isLiveGemini: false,
      model: 'local-fallback',
      disclaimer: `Script engine notice: ${err.message || 'Service busy'}. Template provided.`,
    };
  }
}

// ----------------------------------------------------
// Admin AI Metrics & Configuration
// ----------------------------------------------------

export function getAiMetricsAdmin(adminUserId: string): AiMetrics {
  const user = findUserById(adminUserId);
  if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
    throw new Error('Unauthorized: Admin or Owner role required to inspect AI telemetry.');
  }
  return {
    ...aiMetrics,
  };
}

export function updateAiConfigAdmin(adminUserId: string, patch: Partial<AiConfig>, ip: string = '127.0.0.1'): AiConfig {
  const user = findUserById(adminUserId);
  if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
    throw new Error('Unauthorized: Admin or Owner role required to modify AI system settings.');
  }

  if (patch.rateLimitPerUserPerMin !== undefined) {
    aiConfig.rateLimitPerUserPerMin = Math.max(1, patch.rateLimitPerUserPerMin);
  }
  if (patch.rateLimitPerIpPerMin !== undefined) {
    aiConfig.rateLimitPerIpPerMin = Math.max(1, patch.rateLimitPerIpPerMin);
  }
  if (patch.maxCharLength !== undefined) {
    aiConfig.maxCharLength = Math.max(100, patch.maxCharLength);
  }
  if (patch.isLiveApiEnabled !== undefined) {
    aiConfig.isLiveApiEnabled = Boolean(patch.isLiveApiEnabled);
  }
  if (patch.globalDailyBudget !== undefined) {
    aiConfig.globalDailyBudget = Math.max(100, patch.globalDailyBudget);
  }

  addAuditLog(adminUserId, 'AI_CONFIG_UPDATED', patch, ip);
  return aiConfig;
}

export function getAiConfig(): AiConfig {
  return { ...aiConfig };
}
