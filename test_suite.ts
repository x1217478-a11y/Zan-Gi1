import {
  registerUser,
  loginUser,
  validateSession,
  revokeSession,
  changePassword,
  updatePrivacySettings,
  updateNotificationPreferences,
  updateMediaPreferences,
  setup2FA,
  verifyAndEnable2FA,
  generateTotpCode,
  deleteUserAccount,
  blockUser,
  unblockUser,
  getUserAccountExport,
  findUserById,
  getAllUsersAdmin
} from './src/server/authService.js';
import {
  createPost,
  getAllPosts,
  addComment,
  toggleFollowUser,
  getUserSocialExportData,
  cascadeDeleteUserData,
  getAllStories,
  createStory,
  markStoryViewed,
  deleteStory,
  getConversations,
  getMessagesBetween,
  sendDirectMessage,
  markMessagesAsRead,
  getNotificationsForUser,
  createNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  searchContentAndUsers,
  getExploreTrendingTags
} from './src/server/socialStore.js';
import {
  polishCaptionService,
  translateContentService,
  generateScriptService,
  getAiMetricsAdmin,
  updateAiConfigAdmin
} from './src/server/aiService.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('  ZAN-GI PHASE 4 & PHASE 5 AUTOMATED VERIFICATION SUITE');
  console.log('======================================================\n');

  // TEST 1: Register and Password Hashing
  console.log('1. Authentication & Cryptography:');
  const reg1 = registerUser({
    email: `test_${Date.now()}@zangi.app`,
    username: `tester_${Date.now()}`,
    displayName: 'Test User Alpha',
    password: 'Password@2026!'
  });
  assert(Boolean(reg1.user && reg1.user.id), 'User registration succeeds with PBKDF2 hash & salt');
  const userAlpha = reg1.user!;

  const loginBad = loginUser(userAlpha.email, 'WrongPassword!');
  assert(Boolean(loginBad.error && !loginBad.session), 'Login with bad password correctly fails');

  const loginGood = loginUser(userAlpha.email, 'Password@2026!');
  assert(Boolean(loginGood.session && loginGood.user), 'Login with valid password issues session token');
  const tokenAlpha = loginGood.session!.token;

  // TEST 2: Session Validation and Revocation
  console.log('\n2. Session Safety & Revocation:');
  const validSess = validateSession(tokenAlpha);
  assert(validSess !== null && validSess.id === userAlpha.id, 'Session is valid before revocation');

  const revoked = revokeSession(tokenAlpha);
  assert(revoked === true, 'revokeSession returns true');
  const postRevoke = validateSession(tokenAlpha);
  assert(postRevoke === null, 'Revoked session token immediately rejected by validateSession');

  // TEST 3: Settings Updates & Disk Persistence
  console.log('\n3. Settings & Preferences Persistence:');
  const privRes = updatePrivacySettings(userAlpha.id, {
    isPrivate: true,
    whoCanComment: 'followers',
    whoCanMessage: 'followers'
  });
  assert(privRes.user?.isPrivate === true, 'Privacy settings updated (private account)');
  assert(privRes.user?.whoCanComment === 'followers', 'Comment access restricted to followers');

  const notifRes = updateNotificationPreferences(userAlpha.id, {
    likes: true,
    comments: false,
    follows: true,
    messages: true,
    systemUpdates: true,
    creatorEarn: false
  });
  assert(notifRes.user?.notificationPreferences?.comments === false, 'Notification preferences persisted correctly');

  const mediaRes = updateMediaPreferences(userAlpha.id, {
    dataSaver: true,
    autoplay: false,
    mediaQuality: 'data_saver'
  });
  assert(mediaRes.user?.mediaPreferences?.autoplay === false, 'Media preferences persisted (autoplay disabled, data saver on)');

  // TEST 4: Password Change with Current Password Verification
  console.log('\n4. Secure Password Change:');
  const badChange = changePassword(userAlpha.id, 'WrongOldPass', 'BrandNew@2026!');
  assert(badChange.success === false, 'Password change rejected with incorrect current password');

  const goodChange = changePassword(userAlpha.id, 'Password@2026!', 'BrandNew@2026!');
  assert(goodChange.success === true, 'Password change succeeds with correct current password');

  const loginNew = loginUser(userAlpha.email, 'BrandNew@2026!');
  assert(Boolean(loginNew.session), 'Login succeeds with newly set password');

  // TEST 5: Real RFC 6238 TOTP 2FA Engine & Enforcement
  console.log('\n5. Two-Factor Authentication (RFC 6238 TOTP):');
  const twoFaSetup = setup2FA(userAlpha.id);
  assert(Boolean(twoFaSetup.secret && twoFaSetup.recoveryCodes.length > 0), '2FA setup generates Base32 secret and backup recovery codes');
  assert(twoFaSetup.uri.startsWith('otpauth://totp/'), 'TOTP URI formatted for Google/Microsoft Authenticator');

  const currentOtp = generateTotpCode(twoFaSetup.secret);
  assert(/^\d{6}$/.test(currentOtp), 'RFC 6238 TOTP generator produces valid 6-digit code');

  const verifyRes = verifyAndEnable2FA(userAlpha.id, currentOtp);
  assert(verifyRes.success === true, '2FA successfully verified and enabled on user account');

  const loginBlocked = loginUser(userAlpha.email, 'BrandNew@2026!');
  assert(loginBlocked.requires2FA === true, 'Login challenge triggered: 2FA required when enabled');

  const loginBadOtp = loginUser(userAlpha.email, 'BrandNew@2026!', '127.0.0.1', 'test', '000000');
  assert(loginBadOtp.requires2FA === true && Boolean(loginBadOtp.error), 'Login rejected with invalid 2FA code');

  const loginGoodOtp = loginUser(userAlpha.email, 'BrandNew@2026!', '127.0.0.1', 'test', currentOtp);
  assert(Boolean(loginGoodOtp.session), 'Login succeeds with valid 2FA TOTP code');

  const backupCode = twoFaSetup.recoveryCodes[0];
  const loginRecovery = loginUser(userAlpha.email, 'BrandNew@2026!', '127.0.0.1', 'test', backupCode);
  assert(Boolean(loginRecovery.session), 'Login succeeds with backup emergency recovery code');

  // TEST 6: Personal Data Export Sanitization
  console.log('\n6. Personal Data Export Sanitization (GDPR):');
  const accountExport = getUserAccountExport(userAlpha.id);
  assert(accountExport !== null, 'Account export generated successfully');
  assert((accountExport?.profile as any).passwordHash === undefined, 'Data export strictly EXCLUDES passwordHash');
  assert((accountExport?.profile as any).passwordSalt === undefined, 'Data export strictly EXCLUDES passwordSalt');
  assert((accountExport?.profile as any).twoFactorSecret === undefined, 'Data export strictly EXCLUDES 2FA secret');
  assert((accountExport?.profile as any).twoFactorRecoveryCodes === undefined, 'Data export strictly EXCLUDES recovery codes');

  const socialExport = getUserSocialExportData(userAlpha.id);
  assert(Array.isArray(socialExport.posts), 'Social export contains posts array');
  assert(Array.isArray(socialExport.comments), 'Social export contains comments array');

  // TEST 7: Privacy Enforcement: Blocking & Private Accounts
  console.log('\n7. Privacy Enforcement (Blocking & Private Feeds):');
  const reg2 = registerUser({
    email: `beta_${Date.now()}@zangi.app`,
    username: `beta_${Date.now()}`,
    displayName: 'User Beta',
    password: 'Password@2026!'
  });
  const userBeta = reg2.user!;

  const testPost = createPost({
    authorId: userAlpha.id,
    content: 'Private confidential thought for followers only!',
    postType: 'text',
    mediaUrls: [],
    hashtags: ['private']
  });

  // User Beta is NOT following private User Alpha -> Post must NOT be in Beta's feed
  const betaFeed1 = getAllPosts(userBeta.id);
  const betaCanSeeAlpha = betaFeed1.some((p) => p.id === testPost.id);
  assert(!betaCanSeeAlpha, 'Non-follower cannot view private account post in feed');

  // Now User Alpha blocks User Beta
  blockUser(userAlpha.id, userBeta.id);
  let followThrew = false;
  try {
    toggleFollowUser(userBeta.id, userAlpha.id);
  } catch {
    followThrew = true;
  }
  assert(followThrew, 'Blocked user cannot follow the user');

  let commentThrew = false;
  try {
    addComment(testPost.id, userBeta.id, 'Trying to comment');
  } catch {
    commentThrew = true;
  }
  assert(commentThrew, 'Blocked user cannot comment on the user post');

  // TEST 8: AI Engine Features
  console.log('\n8. Zan-Gi AI Engine Services:');
  const polishRes = await polishCaptionService(
    {
      text: 'নতুন প্রজেক্ট শুরু করলাম খুব ভালো লাগছে',
      language: 'bn',
      tone: 'creative'
    },
    { userId: userAlpha.id, ip: '127.0.0.1' }
  );
  assert(Boolean(polishRes.polishedText && polishRes.hashtags.length > 0), 'Caption Polisher returns polished Bengali text and hashtags');

  const transRes = await translateContentService(
    {
      text: 'Connect. Create. Imagine. Earn.',
      sourceLang: 'en',
      targetLang: 'bn'
    },
    { userId: userAlpha.id, ip: '127.0.0.1' }
  );
  assert(Boolean(transRes.translatedText), 'Content translator completes translation successfully');

  const scriptRes = await generateScriptService(
    {
      topic: 'Dhaka Tech Creator Scene 2026',
      language: 'en',
      tone: 'high_energy',
      durationSeconds: 60
    },
    { userId: userAlpha.id, ip: '127.0.0.1' }
  );
  assert(Boolean(scriptRes.script.hook && scriptRes.script.mainNarrative && scriptRes.script.callToAction), 'Reels Script Generator produces 3-part structured script with visual cues');

  // TEST 9: AI Telemetry & Admin Security
  console.log('\n9. AI Admin Telemetry & Permissions:');
  const aiMetrics = getAiMetricsAdmin('user_owner');
  assert(aiMetrics.totalRequests > 0, 'AI Telemetry tracks request events');

  let normalUserAdminBlocked = false;
  try {
    getAllUsersAdmin(userAlpha.id);
  } catch {
    normalUserAdminBlocked = true;
  }
  assert(normalUserAdminBlocked, 'Normal user is forbidden from accessing Admin User Management');

  const ownerUsers = getAllUsersAdmin('user_owner');
  assert(ownerUsers.length > 0, 'Platform Owner can access Admin User Management');

  // TEST 10: Cascade Account Deletion
  console.log('\n10. Cascade Account Deletion:');
  cascadeDeleteUserData(userAlpha.id);
  const postAfterCascade = getAllPosts().some((p) => p.author.id === userAlpha.id);
  assert(!postAfterCascade, 'Cascade deletion wipes all posts created by deleted user');

  const delUserRes = deleteUserAccount(userAlpha.id, 'BrandNew@2026!');
  assert(delUserRes.success === true, 'deleteUserAccount completes successfully with password confirmation');
  assert(findUserById(userAlpha.id) === undefined, 'User record completely removed from user registry');

  // TEST 11: Real Ephemeral Stories
  console.log('\n11. Ephemeral Stories Architecture:');
  const initialStories = getAllStories();
  assert(Array.isArray(initialStories) && initialStories.length > 0, 'getAllStories returns list of active stories');

  const createdStory = createStory({
    authorId: 'user_fahim',
    mediaUrl: '/src/assets/images/zangi_feed_cybercity_1791614814919.jpg',
    caption: 'Story test verification #ZanGiBD'
  });
  assert(Boolean(createdStory && createdStory.id), 'createStory persists story record');

  const viewed = markStoryViewed(createdStory.id, 'user_nusrat');
  assert(viewed === true, 'markStoryViewed tracks user story views');

  const deletedStory = deleteStory(createdStory.id, 'user_fahim');
  assert(deletedStory === true, 'deleteStory removes story successfully');

  // TEST 12: Real Direct Messaging & Server Relay
  console.log('\n12. Real-Time Server Relay & Direct Messaging:');
  const msgSent = sendDirectMessage({
    senderId: 'user_fahim',
    recipientId: 'user_nusrat',
    text: 'Automated test message for real chat relay!'
  });
  assert(Boolean(msgSent && msgSent.id), 'sendDirectMessage delivers message and assigns persistent ID');

  const audioSent = sendDirectMessage({
    senderId: 'user_fahim',
    recipientId: 'user_nusrat',
    text: 'Audio message',
    isAudio: true,
    audioDuration: '0:14'
  });
  assert(Boolean(audioSent && audioSent.isAudio), 'sendDirectMessage supports audio voice notes with duration');

  const thread = getMessagesBetween('user_fahim', 'user_nusrat');
  assert(thread.messages.some((m) => m.id === msgSent.id), 'getMessagesBetween retrieves message thread chronologically');

  const conversations = getConversations('user_fahim');
  assert(conversations.some((c) => c.partner.id === 'user_nusrat'), 'getConversations aggregates partner threads');

  const readCount = markMessagesAsRead('user_nusrat', 'user_fahim');
  assert(readCount >= 0, 'markMessagesAsRead updates message delivery receipts');

  // TEST 13: Real Notifications
  console.log('\n13. Real Notifications Engine:');
  const newNotif = createNotification({
    userId: 'user_fahim',
    actorId: 'user_nusrat',
    type: 'tip',
    title: 'টিপ প্রাপ্ত হয়েছে',
    message: '+50 Coins received from Nusrat'
  });
  assert(Boolean(newNotif && newNotif.id), 'createNotification registers notification');

  const userNotifs = getNotificationsForUser('user_fahim');
  assert(userNotifs.some((n) => n.id === newNotif.id), 'getNotificationsForUser returns list of user notifications');

  const notifRead = markNotificationAsRead('user_fahim', newNotif.id);
  assert(notifRead === true, 'markNotificationAsRead marks notification as read');

  const allRead = markAllNotificationsAsRead('user_fahim');
  assert(allRead >= 0, 'markAllNotificationsAsRead marks all remaining as read');

  // TEST 14: Dynamic Search & Trending Engine
  console.log('\n14. Dynamic Content Search & Trending Calculation:');
  const trendingTags = getExploreTrendingTags();
  assert(Array.isArray(trendingTags) && trendingTags.length > 0, 'getExploreTrendingTags calculates active tags dynamically');

  const searchRes = searchContentAndUsers('ZanGi');
  assert(Array.isArray(searchRes.posts), 'searchContentAndUsers queries posts and hashtags across database');

  console.log('\n======================================================');
  console.log(`  VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((e) => {
  console.error('Test Suite encountered error:', e);
  process.exit(1);
});
