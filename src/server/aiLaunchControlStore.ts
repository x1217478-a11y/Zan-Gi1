/**
 * Zan-Gi Owner-Only AI Launch Activity Controls Engine
 *
 * Implements private AI launch tools for the platform Owner only:
 * - AI discovery assistance (hashtag & tag optimization)
 * - AI content recommendations feed boosting
 * - AI launch preview generators
 * - Clearly isolated simulated activity for internal staging/demo testing
 * - Configurable limits, session expiry TTL, and hourly rate limits
 * - EMERGENCY KILL SWITCH: One-click absolute shutdown of all simulated activity
 * - Audit logs for all owner actions
 *
 * HARD INTEGRITY RULES:
 * - Simulated activity is ALWAYS tagged with isDemoData: true and isSimulatedActivity: true
 * - Simulated activity is NEVER counted toward:
 *   1. Genuine public engagement claims
 *   2. AdMob revenue calculations
 *   3. Creator eligibility (follower requirements, account milestones)
 *   4. Creator coin earnings or withdrawal ledgers
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { AiLaunchConfig } from '../types/index.js';
import { findUserById, addAuditLog } from './authService.js';
import { atomicWriteJson, safeReadJson } from './database.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const AI_LAUNCH_CONFIG_FILE = path.join(DATA_DIR, 'ai_launch_config.json');

// Default initial state for fresh install / restart
const defaultAiLaunchConfig: AiLaunchConfig = {
  isDiscoveryAssistanceEnabled: true,
  isContentRecommendationsEnabled: true,
  isLaunchPreviewEnabled: true,
  isSimulatedActivityEnabled: false, // Default OFF
  emergencyKillSwitchActive: false,
  simulationRateLimitPerHour: 30,
  simulationSessionExpiresAt: null,
  simulationMaxItems: 15,
  activeSimulationsCount: 0,
  auditHistory: [],
};

let aiLaunchConfig: AiLaunchConfig = { ...defaultAiLaunchConfig };

function loadAiLaunchConfig() {
  try {
    if (fs.existsSync(AI_LAUNCH_CONFIG_FILE)) {
      const parsed = safeReadJson<AiLaunchConfig>(AI_LAUNCH_CONFIG_FILE, defaultAiLaunchConfig);
      if (parsed) {
        aiLaunchConfig = {
          ...defaultAiLaunchConfig,
          ...parsed,
          auditHistory: Array.isArray(parsed.auditHistory) ? parsed.auditHistory : [],
        };
      }
    } else {
      saveAiLaunchConfig();
    }
  } catch (err) {
    console.warn('[AiLaunchStore] Failed to load AI launch config, using defaults:', err);
  }
}

function saveAiLaunchConfig() {
  try {
    atomicWriteJson(AI_LAUNCH_CONFIG_FILE, aiLaunchConfig);
  } catch (err) {
    console.error('[AiLaunchStore] Failed to persist AI launch config:', err);
  }
}

loadAiLaunchConfig();

/**
 * Asserts that the caller is the verified Platform Owner.
 * Throws an authorization error if caller is a regular admin or regular user.
 */
export function assertOwnerAuthorization(userId: string): void {
  const user = findUserById(userId);
  if (!user || user.role !== 'owner') {
    throw new Error('Forbidden: Platform Owner privileges strictly required for AI launch controls.');
  }
}

/**
 * Retrieves current AI launch configuration for owner inspection.
 */
export function getAiLaunchConfig(ownerUserId: string): AiLaunchConfig {
  assertOwnerAuthorization(ownerUserId);

  // Check if simulation session expired
  if (aiLaunchConfig.simulationSessionExpiresAt) {
    const expires = new Date(aiLaunchConfig.simulationSessionExpiresAt).getTime();
    if (Date.now() > expires && aiLaunchConfig.isSimulatedActivityEnabled) {
      aiLaunchConfig.isSimulatedActivityEnabled = false;
      aiLaunchConfig.simulationSessionExpiresAt = null;
      saveAiLaunchConfig();
    }
  }

  return { ...aiLaunchConfig };
}

/**
 * Updates AI launch configuration settings.
 */
export function updateAiLaunchConfig(
  ownerUserId: string,
  patch: Partial<AiLaunchConfig>,
  reason: string,
  ip: string = '127.0.0.1'
): { success: boolean; config: AiLaunchConfig } {
  assertOwnerAuthorization(ownerUserId);

  if (!reason || !reason.trim()) {
    throw new Error('An audit reason is required to modify AI launch configuration.');
  }

  // If emergency kill switch is active, simulation cannot be enabled
  if (aiLaunchConfig.emergencyKillSwitchActive && patch.isSimulatedActivityEnabled) {
    throw new Error('Cannot enable simulated activity while the Emergency Kill Switch is ACTIVE. Deactivate the kill switch first.');
  }

  if (patch.isDiscoveryAssistanceEnabled !== undefined) {
    aiLaunchConfig.isDiscoveryAssistanceEnabled = patch.isDiscoveryAssistanceEnabled;
  }
  if (patch.isContentRecommendationsEnabled !== undefined) {
    aiLaunchConfig.isContentRecommendationsEnabled = patch.isContentRecommendationsEnabled;
  }
  if (patch.isLaunchPreviewEnabled !== undefined) {
    aiLaunchConfig.isLaunchPreviewEnabled = patch.isLaunchPreviewEnabled;
  }
  if (patch.isSimulatedActivityEnabled !== undefined) {
    aiLaunchConfig.isSimulatedActivityEnabled = patch.isSimulatedActivityEnabled;
    if (patch.isSimulatedActivityEnabled && !aiLaunchConfig.simulationSessionExpiresAt) {
      // Auto-expire simulation sessions in 2 hours to prevent forgotten running tests
      aiLaunchConfig.simulationSessionExpiresAt = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
    } else if (!patch.isSimulatedActivityEnabled) {
      aiLaunchConfig.simulationSessionExpiresAt = null;
    }
  }
  if (patch.simulationRateLimitPerHour !== undefined) {
    aiLaunchConfig.simulationRateLimitPerHour = Math.max(1, Math.min(100, patch.simulationRateLimitPerHour));
  }
  if (patch.simulationMaxItems !== undefined) {
    aiLaunchConfig.simulationMaxItems = Math.max(1, Math.min(50, patch.simulationMaxItems));
  }
  if (patch.simulationSessionExpiresAt !== undefined) {
    aiLaunchConfig.simulationSessionExpiresAt = patch.simulationSessionExpiresAt;
  }

  const logEntry = {
    timestamp: new Date().toISOString(),
    action: 'AI_LAUNCH_CONFIG_UPDATED',
    ownerId: ownerUserId,
    details: { patch, reason: reason.trim() },
    ip,
  };

  aiLaunchConfig.auditHistory.unshift(logEntry);
  if (aiLaunchConfig.auditHistory.length > 100) {
    aiLaunchConfig.auditHistory.pop();
  }

  saveAiLaunchConfig();
  addAuditLog(ownerUserId, 'AI_LAUNCH_CONFIG_UPDATED', { patch, reason }, ip);

  return { success: true, config: { ...aiLaunchConfig } };
}

/**
 * Emergency Kill Switch:
 * Immediately disables all simulated activity, revokes active simulation sessions,
 * disables discovery boosts, and locks the system in emergency safe mode.
 */
export function activateEmergencyKillSwitch(
  ownerUserId: string,
  reason: string = 'Owner manual emergency shutdown triggered',
  ip: string = '127.0.0.1'
): { success: boolean; config: AiLaunchConfig } {
  assertOwnerAuthorization(ownerUserId);

  aiLaunchConfig.emergencyKillSwitchActive = true;
  aiLaunchConfig.isSimulatedActivityEnabled = false;
  aiLaunchConfig.isDiscoveryAssistanceEnabled = false;
  aiLaunchConfig.isContentRecommendationsEnabled = false;
  aiLaunchConfig.simulationSessionExpiresAt = null;

  const logEntry = {
    timestamp: new Date().toISOString(),
    action: 'EMERGENCY_KILL_SWITCH_ACTIVATED',
    ownerId: ownerUserId,
    details: { reason },
    ip,
  };

  aiLaunchConfig.auditHistory.unshift(logEntry);
  saveAiLaunchConfig();

  addAuditLog(ownerUserId, 'EMERGENCY_KILL_SWITCH_ACTIVATED', { reason }, ip);
  console.warn(`[AiLaunchStore] 🚨 EMERGENCY KILL SWITCH ACTIVATED by Owner ${ownerUserId}: ${reason}`);

  return { success: true, config: { ...aiLaunchConfig } };
}

/**
 * Deactivates Emergency Kill Switch to restore normal operations.
 */
export function deactivateEmergencyKillSwitch(
  ownerUserId: string,
  reason: string,
  ip: string = '127.0.0.1'
): { success: boolean; config: AiLaunchConfig } {
  assertOwnerAuthorization(ownerUserId);

  if (!reason || !reason.trim()) {
    throw new Error('An audit reason is required to deactivate the Emergency Kill Switch.');
  }

  aiLaunchConfig.emergencyKillSwitchActive = false;
  // Restore basic assistance safely, but keep simulation OFF by default
  aiLaunchConfig.isDiscoveryAssistanceEnabled = true;
  aiLaunchConfig.isContentRecommendationsEnabled = true;
  aiLaunchConfig.isSimulatedActivityEnabled = false;

  const logEntry = {
    timestamp: new Date().toISOString(),
    action: 'EMERGENCY_KILL_SWITCH_DEACTIVATED',
    ownerId: ownerUserId,
    details: { reason },
    ip,
  };

  aiLaunchConfig.auditHistory.unshift(logEntry);
  saveAiLaunchConfig();

  addAuditLog(ownerUserId, 'EMERGENCY_KILL_SWITCH_DEACTIVATED', { reason }, ip);
  return { success: true, config: { ...aiLaunchConfig } };
}

/**
 * Generates an isolated internal simulation batch for staging/demo testing.
 * STRICT ISOLATION:
 * - All generated items are marked with isDemoData: true and isSimulatedActivity: true.
 * - Under no circumstances are these counted toward AdMob revenue, creator coins, or eligibility.
 */
export function generateIsolatedSimulationBatch(
  ownerUserId: string,
  itemType: 'post' | 'reel' | 'interaction',
  count: number = 3,
  ip: string = '127.0.0.1'
): {
  success: boolean;
  generatedItems: Array<{
    id: string;
    type: string;
    content: string;
    simulatedViews: number;
    simulatedLikes: number;
    isSimulatedActivity: boolean;
    isDemoData: boolean;
    disclaimer: string;
  }>;
} {
  assertOwnerAuthorization(ownerUserId);

  if (aiLaunchConfig.emergencyKillSwitchActive) {
    throw new Error('Cannot run simulations: Emergency Kill Switch is currently ACTIVE.');
  }

  // 1. Automatic 2-hour session expiry check
  if (aiLaunchConfig.simulationSessionExpiresAt) {
    const expires = new Date(aiLaunchConfig.simulationSessionExpiresAt).getTime();
    if (Date.now() > expires) {
      aiLaunchConfig.isSimulatedActivityEnabled = false;
      aiLaunchConfig.simulationSessionExpiresAt = null;
      saveAiLaunchConfig();
      throw new Error('Simulation session has expired (2-hour TTL exceeded). Re-enable in AI Launch Controls.');
    }
  }

  if (!aiLaunchConfig.isSimulatedActivityEnabled) {
    throw new Error('Simulated activity is currently disabled. Enable it in AI Launch Controls first.');
  }

  // 2. Hourly rate limit check (default 30 items per hour)
  const oneHourAgo = Date.now() - 3600 * 1000;
  const recentHourlyCount = aiLaunchConfig.auditHistory
    .filter(
      (entry) =>
        entry.action === 'SIMULATION_BATCH_GENERATED' &&
        new Date(entry.timestamp).getTime() > oneHourAgo
    )
    .reduce((sum, entry) => sum + (Number(entry.details?.count) || 0), 0);

  const hourlyLimit = aiLaunchConfig.simulationRateLimitPerHour || 30;
  if (recentHourlyCount + count > hourlyLimit) {
    throw new Error(
      `Simulation rate limit exceeded: ${recentHourlyCount}/${hourlyLimit} items generated in the past hour. Please wait before generating more.`
    );
  }

  const safeCount = Math.min(count, aiLaunchConfig.simulationMaxItems, 5);
  const items: Array<{
    id: string;
    type: string;
    content: string;
    simulatedViews: number;
    simulatedLikes: number;
    isSimulatedActivity: boolean;
    isDemoData: boolean;
    disclaimer: string;
  }> = [];

  const sampleBengaliTopics = [
    'বাংলা এআই ক্রিয়েটর আর্নিং মডেল ২০২৬',
    'ঢাকার টেক কমিউনিটির নতুন দিগন্ত',
    'পদ্মার দৃশ্য ও ঐতিহ্যবাহী কারুকাজ',
    'Zan-Gi স্মার্ট ভিডিও ফিল্টার ও রিচ বৃদ্ধি',
  ];

  for (let i = 0; i < safeCount; i++) {
    const topic = sampleBengaliTopics[i % sampleBengaliTopics.length];
    const simId = `sim_${itemType}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const simulatedViews = Math.floor(Math.random() * 60) + 15;
    const simulatedLikes = Math.floor(Math.random() * 15) + 3;
    items.push({
      id: simId,
      type: itemType,
      content: `[INTERNAL SIMULATION] ${topic} — এই কনটেন্টটি অভ্যন্তরীণ পরীক্ষার জন্য তৈরি করা হয়েছে। কোনো প্রকার অর্গানিক রেভিনিউ বা যোগ্যতায় এটি গণ্য হবে না।`,
      simulatedViews,
      simulatedLikes,
      isSimulatedActivity: true,
      isDemoData: true,
      disclaimer: 'Internal simulation item. Quarantined from creator earnings, AdMob yield, and monetization eligibility.',
    });
  }

  aiLaunchConfig.activeSimulationsCount += items.length;
  aiLaunchConfig.auditHistory.unshift({
    timestamp: new Date().toISOString(),
    action: 'SIMULATION_BATCH_GENERATED',
    ownerId: ownerUserId,
    details: { itemType, count: items.length },
    ip,
  });

  saveAiLaunchConfig();
  addAuditLog(ownerUserId, 'SIMULATION_BATCH_GENERATED', { itemType, count: items.length }, ip);

  return { success: true, generatedItems: items };
}
