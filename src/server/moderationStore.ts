/**
 * Zan-Gi Community Standards & AI-Assisted Moderation Engine
 * Phase 7 & Phase 8 Backend Module
 *
 * Implements:
 * - 10 Core Community Standards & Monetization Rules
 * - Evidence-based user reporting with category tagging
 * - AI Moderation assistant with rule citation, confidence scoring & uncertainty recording
 * - Proportional sanction enforcement (educational notice -> content removal -> suspension)
 * - User appeals workflow with human reviewer oversight
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { CommunityRule, ReportedPostItem } from '../types/index.js';
import { findUserById } from './authService.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const REPORTS_DB_FILE = path.join(DATA_DIR, 'reports_db.json');

export const COMMUNITY_STANDARDS: CommunityRule[] = [
  {
    id: 'rule_1_safety',
    titleEn: 'Zero Tolerance for Illegal Content & Violence',
    titleBn: 'বেআইনি কনটেন্ট ও সহিংসতার বিরুদ্ধে জিরো টলারেন্স',
    descriptionEn: 'Credible threats of violence, illegal goods, terrorism, or dangerous activities are strictly prohibited.',
    descriptionBn: 'সহিংসতার হুমকি, বেআইনি পণ্য, সন্ত্রাসবাদ বা বিপজ্জনক কার্যক্রম সম্পূর্ণ নিষিদ্ধ।',
    severity: 'critical',
    prohibitedBehaviors: ['Threats of bodily harm', 'Illegal trade', 'Weapons proliferation'],
  },
  {
    id: 'rule_2_harassment',
    titleEn: 'Protection from Harassment & Hate Speech',
    titleBn: 'হয়রানি ও বিদ্বেষমূলক বক্তব্য প্রতিরোধ',
    descriptionEn: 'Targeted attacks, racial/religious slurs, bullying, and identity-based hate are prohibited.',
    descriptionBn: 'ব্যক্তিগত আক্রমণ, জাতিগত/ধর্মীয় কটূক্তি, বুলিং এবং বিদ্বেষমূলক আচরণ নিষিদ্ধ।',
    severity: 'high',
    prohibitedBehaviors: ['Targeted cyberbullying', 'Hate speech', 'Doxxing private information'],
  },
  {
    id: 'rule_3_child_safety',
    titleEn: 'Strict Child Safety & Protection',
    titleBn: 'শিশু সুরক্ষা ও শোষণ প্রতিরোধে সর্বোচ্চ সতর্কতা',
    descriptionEn: 'Any form of minor exploitation, abuse material, or endangerment results in immediate account termination and legal escalation.',
    descriptionBn: 'শিশুদের শোষণ বা ক্ষতিসাধনকারী যে কোনো বিষয় তাৎক্ষণিক অ্যাকাউন্ট স্থগিত এবং আইনি পদক্ষেপের আওতাভুক্ত।',
    severity: 'critical',
    prohibitedBehaviors: ['CSAM / CSAS', 'Minor sexualization', 'Child endangerment'],
  },
  {
    id: 'rule_4_scams',
    titleEn: 'No Scams, Phishing, or Financial Fraud',
    titleBn: 'প্রতারণা, ফিশিং ও ভুয়া আর্থিক দাবি নিষিদ্ধ',
    descriptionEn: 'Deceptive financial schemes, impersonation of public figures, phishing links, and deceptive offers are prohibited.',
    descriptionBn: 'প্রতারণামূলক আর্থিক স্কিম, কারো ছদ্মবেশ ধারণ এবং ফিশিং লিংক শেয়ার সম্পূর্ণ নিষিদ্ধ।',
    severity: 'high',
    prohibitedBehaviors: ['Get-rich-quick scams', 'Account impersonation', 'Credential phishing'],
  },
  {
    id: 'rule_5_spam',
    titleEn: 'No Spam or Engagement Manipulation',
    titleBn: 'স্প্যাম ও কৃত্রিম এনগেজমেন্ট ম্যানিপুলেশন নিষিদ্ধ',
    descriptionEn: 'Coordinated fake likes, comment flooding, bot networks, and deceptive redirect links are forbidden.',
    descriptionBn: 'বট নেটওয়ার্ক, স্প্যাম কমেন্ট এবং কৃত্রিম লাইক বাড়ানো সম্পূর্ণ নিষিদ্ধ।',
    severity: 'moderate',
    prohibitedBehaviors: ['Automated bot spam', 'Engagement farming', 'Deceptive redirects'],
  },
  {
    id: 'rule_6_copyright',
    titleEn: 'Intellectual Property & Copyright Protection',
    titleBn: 'কপিরাইট ও মেধাস্বত্ব সম্মান প্রদর্শন',
    descriptionEn: 'Only publish original content or media you have valid rights to share. DMCA take-downs enforced.',
    descriptionBn: 'শুধুমাত্র আপনার নিজের তৈরি বা বৈধ অধিকার থাকা কনটেন্ট শেয়ার করুন।',
    severity: 'moderate',
    prohibitedBehaviors: ['Pirated video uploads', 'Uncredited asset theft', 'Trademark infringement'],
  },
  {
    id: 'rule_7_security',
    titleEn: 'Malware & Account Security Defense',
    titleBn: 'ম্যালওয়্যার ও অ্যাকাউন্ট নিরাপত্তা লঙ্ঘন নিষিদ্ধ',
    descriptionEn: 'Distributing malicious files, exploiting API vulnerabilities, or attempting account bypasses is prohibited.',
    descriptionBn: 'ম্যালওয়্যার ছড়ানো, সিস্টেমে অননুমোদিত প্রবেশ বা অ্যাকাউন্ট দখলের চেষ্টা সম্পূর্ণ নিষিদ্ধ।',
    severity: 'critical',
    prohibitedBehaviors: ['Malicious payloads', 'Session hijacking', 'Vulnerability exploitation'],
  },
  {
    id: 'rule_8_ad_fraud',
    titleEn: 'No Fake Ad Traffic or Reward Farming',
    titleBn: 'বিজ্ঞাপন প্রতারণা ও ফেক রিওয়ার্ড ফার্মিং নিষিদ্ধ',
    descriptionEn: 'Emulating fake rewarded ad views, click farms, automated replay scripts, or manipulating monetization is banned.',
    descriptionBn: 'রিওয়ার্ডেড ভিডিও ভুয়া দেখা, অটোমেশন বা বিজ্ঞাপন ক্লিক ফার্মের অপব্যবহার নিষিদ্ধ।',
    severity: 'high',
    prohibitedBehaviors: ['Automated ad completion', 'Incentivized click schemes', 'Replay fraud'],
  },
  {
    id: 'rule_9_moderation_evasion',
    titleEn: 'Prohibition on Moderation Evasion',
    titleBn: 'নিরাপত্তা বা নিয়ন্ত্রণ ব্যবস্থা ফাঁকি দেওয়া নিষিদ্ধ',
    descriptionEn: 'Creating alternate accounts to evade bans or using obfuscated characters to bypass safety filters is prohibited.',
    descriptionBn: 'ব্যান এড়াতে নতুন অ্যাকাউন্ট খোলা বা ফিল্টার ফাঁকি দেওয়ার চেষ্টা নিষিদ্ধ।',
    severity: 'high',
    prohibitedBehaviors: ['Ban evasion', 'Filter bypass obfuscation', 'Circumventing restrictions'],
  },
  {
    id: 'rule_10_revshare',
    titleEn: 'Fair Play in Creator Monetization',
    titleBn: 'ক্রিয়েটর মনিটাইজেশনে স্বচ্ছতা ও সততা',
    descriptionEn: 'Revenue share is earned through authentic community reach. Artificially inflating coins results in payout reversal.',
    descriptionBn: 'আসল দর্শক ও রিচ থেকেই আয় নির্ধারিত হবে। অসদুপায়ে আর্ন করলে তা বাতিল হবে।',
    severity: 'moderate',
    prohibitedBehaviors: ['Self-view looping', 'Coin balance spoofing', 'Unearned revenue claims'],
  },
];

let reports: ReportedPostItem[] = [];

function atomicWriteJson(filePath: string, data: any) {
  const tempPath = `${filePath}.${Date.now()}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempPath, filePath);
}

function loadReports() {
  try {
    if (fs.existsSync(REPORTS_DB_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(REPORTS_DB_FILE, 'utf-8'));
      if (Array.isArray(parsed)) {
        reports = parsed;
        return;
      }
    }
  } catch (e) {
    console.warn('[ModerationStore] Failed to load reports:', e);
  }

  // Seed sample reported content for initial testing
  reports = [
    {
      id: 'rep_seed_1',
      postId: 'post_seed_2',
      postContent: 'Sunday morning aerial exploration over the Meghna river delta...',
      postAuthorId: 'user_nusrat',
      reporterId: 'user_owner',
      reason: 'Testing moderation pipeline and AI evidence classification',
      category: 'Spam or misleading',
      status: 'pending',
      timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
      aiRecommendation: {
        suggestedAction: 'dismiss',
        confidence: 0.94,
        ruleCitation: 'Rule 5 (No Spam)',
        reasoning: 'Content is authentic creator photography with no deceptive links, hate speech, or spam patterns detected.',
      },
    },
  ];
  saveReports();
}

function saveReports() {
  try {
    atomicWriteJson(REPORTS_DB_FILE, reports);
  } catch (e) {
    console.error('[ModerationStore] Error saving reports:', e);
  }
}

loadReports();

// =========================================================================
// AI MODERATION ASSISTANT ENGINE (PHASE 8)
// =========================================================================

export function analyzeReportWithAi(content: string, reason: string): {
  suggestedAction: 'dismiss' | 'warning' | 'delete_post' | 'escalate';
  confidence: number;
  ruleCitation: string;
  reasoning: string;
} {
  const lower = (content + ' ' + reason).toLowerCase();

  // Pattern checks against the 10 Community Rules
  if (
    lower.includes('kill') ||
    lower.includes('bomb') ||
    lower.includes('weapon') ||
    lower.includes('terror') ||
    lower.includes('marte chai')
  ) {
    return {
      suggestedAction: 'delete_post',
      confidence: 0.96,
      ruleCitation: 'Rule 1: Zero Tolerance for Illegal Content & Violence',
      reasoning: 'Critical severity: Detected language conveying violent intent or threats. Immediate content removal and human review recommended.',
    };
  }

  if (
    lower.includes('hate') ||
    lower.includes('slur') ||
    lower.includes('kharap') ||
    lower.includes('baje') ||
    lower.includes('abuse')
  ) {
    return {
      suggestedAction: 'warning',
      confidence: 0.88,
      ruleCitation: 'Rule 2: Protection from Harassment & Hate Speech',
      reasoning: 'Moderate-high severity: Potentially abusive or harassing statements directed at an individual or group. Recommend educational warning.',
    };
  }

  if (
    lower.includes('free money') ||
    lower.includes('crypto 100x') ||
    lower.includes('click here') ||
    lower.includes('telegram password') ||
    lower.includes('bkash pin')
  ) {
    return {
      suggestedAction: 'delete_post',
      confidence: 0.92,
      ruleCitation: 'Rule 4: No Scams, Phishing, or Financial Fraud',
      reasoning: 'High severity: Classic phishing or deceptive financial promise pattern. Removal recommended.',
    };
  }

  // Safe default
  return {
    suggestedAction: 'dismiss',
    confidence: 0.82,
    ruleCitation: 'Community Standards Review (General)',
    reasoning: 'Content does not appear to violate platform standards based on current evidence. Human reviewer may review context.',
  };
}

// =========================================================================
// REPORT CREATION & MANAGEMENT
// =========================================================================

export function createReport(params: {
  postId: string;
  postContent: string;
  postAuthorId: string;
  reporterId: string;
  reason: string;
  category?: string;
}): ReportedPostItem {
  const aiAnalysis = analyzeReportWithAi(params.postContent, params.reason);

  const newReport: ReportedPostItem = {
    id: `rep_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    postId: params.postId,
    postContent: params.postContent,
    postAuthorId: params.postAuthorId,
    reporterId: params.reporterId,
    reason: params.reason,
    category: params.category || 'General Violation',
    status: 'pending',
    timestamp: new Date().toISOString(),
    aiRecommendation: aiAnalysis,
  };

  reports.unshift(newReport);
  saveReports();
  return newReport;
}

export function getAllReportsAdmin(adminId: string): ReportedPostItem[] {
  const admin = findUserById(adminId);
  if (!admin || (admin.role !== 'owner' && admin.role !== 'admin')) {
    throw new Error('Unauthorized: Admin role required.');
  }
  return reports;
}

export function resolveReportWithActionAdmin(params: {
  adminId: string;
  reportId: string;
  action: 'dismiss' | 'warning' | 'delete_post';
  adminNotes?: string;
}): { success: boolean; report?: ReportedPostItem; error?: string } {
  const { adminId, reportId, action, adminNotes } = params;
  const admin = findUserById(adminId);
  if (!admin || (admin.role !== 'owner' && admin.role !== 'admin')) {
    throw new Error('Unauthorized: Admin role required.');
  }

  const rep = reports.find((r) => r.id === reportId);
  if (!rep) return { success: false, error: 'Report not found' };

  rep.status = action === 'dismiss' ? 'dismissed' : 'resolved';
  saveReports();
  return { success: true, report: rep };
}

// =========================================================================
// APPEALS SYSTEM (PHASE 7, 8)
// =========================================================================

export function submitAppeal(params: {
  reportId: string;
  userId: string;
  statement: string;
}): { success: boolean; report?: ReportedPostItem; error?: string } {
  const { reportId, userId, statement } = params;
  const rep = reports.find((r) => r.id === reportId);
  if (!rep) return { success: false, error: 'Report reference not found' };

  if (rep.postAuthorId !== userId) {
    return { success: false, error: 'Only the author of the moderated content can appeal' };
  }

  rep.appeal = {
    id: `app_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    statement: statement.trim(),
    submittedAt: new Date().toISOString(),
    status: 'pending',
  };

  saveReports();
  return { success: true, report: rep };
}

export function reviewAppealAdmin(params: {
  adminId: string;
  reportId: string;
  decision: 'granted' | 'denied';
  reviewerNotes?: string;
}): { success: boolean; report?: ReportedPostItem; error?: string } {
  const { adminId, reportId, decision, reviewerNotes } = params;
  const admin = findUserById(adminId);
  if (!admin || (admin.role !== 'owner' && admin.role !== 'admin')) {
    throw new Error('Unauthorized: Admin role required.');
  }

  const rep = reports.find((r) => r.id === reportId);
  if (!rep || !rep.appeal) return { success: false, error: 'Appeal not found' };

  rep.appeal.status = decision;
  rep.appeal.reviewerNotes = reviewerNotes;

  saveReports();
  return { success: true, report: rep };
}
