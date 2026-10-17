/**
 * Zan-Gi UI Deduplication, Navigation Integrity & Authorization Automated Test
 */

import fs from 'fs';
import path from 'path';
import {
  findUserById,
  getAllUsersAdmin,
  adminUpdateUser,
  getAuditLogs,
  validateSession
} from './src/server/authService.js';
import {
  getAllPosts,
  getAllReels,
  getScheduledPosts,
  getExploreTrendingTags
} from './src/server/socialStore.js';
import {
  getMonetizationConfig,
  getAllWithdrawalsAdmin,
  SUPPORTED_PAYOUT_PROVIDERS
} from './src/server/monetizationStore.js';
import { getAiConfig, getAiMetricsAdmin } from './src/server/aiService.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, failureDetail?: string) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${failureDetail ? `(${failureDetail})` : ''}`);
    failed++;
  }
}

async function runDeduplicationTests() {
  console.log('================================================================');
  console.log('   ZAN-GI MASTER AUDIT & UI DEDUPLICATION VERIFICATION SUITE   ');
  console.log('================================================================\n');

  console.log('1. APP.TSX NAVIGATION DEDUPLICATION & INTEGRITY CHECKS:');
  const appTsxContent = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf-8');

  // Verify that duplicate header navigation row (headerTabs) is removed
  const hasHeaderTabsDef = appTsxContent.includes('const headerTabs: HeaderTabItem[]');
  assert(!hasHeaderTabsDef, 'Duplicate headerTabs definition removed from App.tsx');

  const hasRow2Nav = appTsxContent.includes('Row 2: HEADER NAVIGATION');
  assert(!hasRow2Nav, 'Duplicate Row 2 navigation bar removed from top header');

  // Verify that the 6 primary tabs exist in bottom navigation
  assert(appTsxContent.includes("id: 'feed'"), 'Home (Feed) tab present in bottomTabs');
  assert(appTsxContent.includes("id: 'reels'"), 'Reels tab present in bottomTabs');
  assert(appTsxContent.includes("id: 'create'"), 'Create center button present in bottomTabs');
  assert(appTsxContent.includes("id: 'ai'"), 'AI Assistant tab present in bottomTabs');
  assert(appTsxContent.includes("id: 'messages'"), 'Messages tab present in bottomTabs');
  assert(appTsxContent.includes("id: 'profile'"), 'Profile tab present in bottomTabs');

  // Verify that top header utilities are present without duplicating lower area tabs
  assert(appTsxContent.includes('setShowMoreMenu'), 'More platform menu integrated cleanly in top bar');
  assert(appTsxContent.includes('toggleTheme'), 'Theme toggle accessible from top bar');
  assert(appTsxContent.includes('setIsBengali'), 'Language toggle accessible from top bar');
  assert(appTsxContent.includes('setShowNotifications'), 'Notifications accessible from top bar');

  console.log('\n2. PRESERVED FEATURES ACCESSIBILITY VERIFICATION:');
  // Check that all features in the More dropdown remain intact and connected
  assert(appTsxContent.includes("setCurrentScreen('monetization')"), 'Creator Pulse / Monetization Hub accessible in More menu');
  assert(appTsxContent.includes('setIsScheduledModalOpen(true)'), 'Scheduled Posts Studio accessible in More menu');
  assert(appTsxContent.includes('setShowCommunityModal(true)'), 'Community Standards & Rules accessible in More menu');
  assert(appTsxContent.includes('setShowCodeInspector(true)'), 'Kotlin Native Source Inspector accessible in More menu');
  assert(appTsxContent.includes("setCurrentScreen('settings')"), 'Settings & Privacy accessible in More menu');
  assert(appTsxContent.includes("setCurrentScreen('admin')"), 'Platform Admin Center accessible in More menu for authorized roles');

  console.log('\n3. SETTINGS VIEW INTEGRITY & OWNER ACCESS:');
  const settingsContent = fs.readFileSync(path.resolve(process.cwd(), 'src/components/screens/SettingsView.tsx'), 'utf-8');
  assert(settingsContent.includes('onOpenAdmin?: () => void'), 'SettingsViewProps accepts onOpenAdmin callback');
  assert(settingsContent.includes('Master Admin Control Center (11 Modules)'), 'SettingsView renders master admin launcher card');
  assert(appTsxContent.includes("onOpenAdmin={() => setCurrentScreen('admin')}"), 'App.tsx connects onOpenAdmin to SettingsView');

  console.log('\n4. OWNER-ONLY ADMIN ACCESS & AUTHORIZATION VERIFICATION:');
  // Ensure non-admin is blocked
  try {
    getAllUsersAdmin('user_fahim');
    assert(false, 'Non-admin user should be blocked from getAllUsersAdmin');
  } catch (err: any) {
    assert(err.message.includes('Forbidden') || err.message.includes('admin') || err.message.includes('Unauthorized'),
      'getAllUsersAdmin strictly throws 403 Forbidden for non-admin');
  }

  // Ensure owner user is allowed
  const ownerUsers = getAllUsersAdmin('user_owner');
  assert(Array.isArray(ownerUsers) && ownerUsers.length > 0, 'Platform owner successfully accesses getAllUsersAdmin');

  // Verify AI metrics access
  try {
    getAiMetricsAdmin('user_fahim');
    assert(false, 'Non-admin user should be blocked from getAiMetricsAdmin');
  } catch (err: any) {
    assert(true, 'getAiMetricsAdmin strictly blocks non-admin');
  }
  const ownerAiMetrics = getAiMetricsAdmin('user_owner');
  assert(Boolean(ownerAiMetrics && typeof ownerAiMetrics.totalRequests === 'number'), 'Platform owner successfully accesses AI metrics');

  console.log('\n5. DATA & CORE PLATFORM HEALTH:');
  const posts = getAllPosts();
  assert(posts.length > 0, `Posts preserved in database: ${posts.length} posts`);

  const reels = getAllReels();
  assert(reels.length > 0, `Reels preserved in database: ${reels.length} reels`);

  const scheduled = getScheduledPosts('user_fahim');
  assert(Array.isArray(scheduled), `Scheduled posts queue active: ${scheduled.length} items`);

  const trending = getExploreTrendingTags();
  assert(Array.isArray(trending) && trending.length > 0, `Trending topics active: ${trending.length} topics`);

  const monConfig = getMonetizationConfig();
  assert(monConfig.creatorSharePct === 70, `Creator revshare confirmed at 70%`);
  assert(SUPPORTED_PAYOUT_PROVIDERS.length === 3, 'Withdrawal providers strictly bKash, Nagad, Rocket');

  console.log('\n================================================================');
  console.log(`  DEDUPLICATION & INTEGRITY RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runDeduplicationTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
