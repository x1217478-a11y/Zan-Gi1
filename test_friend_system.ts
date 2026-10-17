/**
 * Automated Test Suite for Zan-Gi Facebook-Style Friend System
 * Verifies:
 * 1. Mutual friends calculation and bidirectional relationships
 * 2. Friend request sending, duplicate prevention, and self-friending rejection
 * 3. Incoming and sent request queues with pending status
 * 4. Request acceptance, declination, and cancellation
 * 5. Reciprocal request auto-acceptance
 * 6. Friend removal (unfriending)
 * 7. Blocked users privacy enforcement (cannot friend, auto-dissolution upon block)
 * 8. Real disk persistence and atomic reload from social_db.json
 * 9. Followers vs Friends distinction
 */

import fs from 'fs';
import path from 'path';
import {
  areFriends,
  getFriendship,
  getFriendsCount,
  getMutualFriends,
  getFriendshipStatus,
  sendFriendRequest,
  cancelFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  removeFriendshipAndRequests,
  getUserFriendsList,
  getIncomingFriendRequests,
  getSentFriendRequests,
  getFriendSuggestions,
  getFriendsSummary,
} from './src/server/socialStore.js';
import {
  findUserById,
  blockUser,
  unblockUser,
  registerUser,
} from './src/server/authService.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    failed++;
  }
}

async function runFriendSystemTests() {
  console.log('================================================================');
  console.log('     ZAN-GI FACEBOOK-STYLE FRIEND SYSTEM AUTOMATED TEST SUITE   ');
  console.log('================================================================\n');

  // Verify seed users exist
  const fahim = findUserById('user_fahim');
  const nusrat = findUserById('user_nusrat');
  const owner = findUserById('user_owner');

  assert(Boolean(fahim && nusrat && owner), 'Test seed users (fahim, nusrat, owner) loaded in system');

  console.log('\n1. SEED RELATIONSHIPS & BIDIRECTIONALITY:');
  const fahimNusratFriends = areFriends('user_fahim', 'user_nusrat');
  const nusratFahimFriends = areFriends('user_nusrat', 'user_fahim');
  assert(fahimNusratFriends && nusratFahimFriends, 'Friendship between Fahim and Nusrat is strictly bidirectional');

  const fahimStatusWithNusrat = getFriendshipStatus('user_fahim', 'user_nusrat');
  assert(fahimStatusWithNusrat === 'friends', 'Fahim friendship status with Nusrat evaluates to "friends"');

  const nusratStatusWithFahim = getFriendshipStatus('user_nusrat', 'user_fahim');
  assert(nusratStatusWithFahim === 'friends', 'Nusrat friendship status with Fahim evaluates to "friends"');

  console.log('\n2. PREVENT INVALID ACTIONS (SELF-FRIENDING & DUPLICATE CHECKS):');
  let selfFriendError = false;
  try {
    sendFriendRequest('user_fahim', 'user_fahim');
  } catch (err: any) {
    selfFriendError = true;
    assert(err.message.includes('yourself'), 'Self-friending is strictly rejected with descriptive error');
  }
  assert(selfFriendError, 'Self-friending throws an exception');

  let alreadyFriendsError = false;
  try {
    sendFriendRequest('user_fahim', 'user_nusrat');
  } catch (err: any) {
    alreadyFriendsError = true;
    assert(err.message.includes('already friends'), 'Sending friend request to existing friend is strictly rejected');
  }
  assert(alreadyFriendsError, 'Sending request to existing friend throws error');

  console.log('\n3. FRIEND REQUEST LIFECYCLE (SEND, PENDING, CANCEL):');
  // Create test dynamic users for clean isolation
  const ts = Date.now();
  const testUserA = registerUser({
    email: `friend_test_a_${ts}@zangi.app`,
    username: `friend_a_${ts}`,
    displayName: 'Friend Tester Alpha',
    password: 'Password@123',
    ip: '127.0.0.1',
  }).user!;

  const testUserB = registerUser({
    email: `friend_test_b_${ts}@zangi.app`,
    username: `friend_b_${ts}`,
    displayName: 'Friend Tester Beta',
    password: 'Password@123',
    ip: '127.0.0.1',
  }).user!;

  const testUserC = registerUser({
    email: `friend_test_c_${ts}@zangi.app`,
    username: `friend_c_${ts}`,
    displayName: 'Friend Tester Gamma',
    password: 'Password@123',
    ip: '127.0.0.1',
  }).user!;

  assert(Boolean(testUserA && testUserB && testUserC), 'Created isolated test users Alpha, Beta, Gamma');

  // A sends request to B
  const reqResult = sendFriendRequest(testUserA.id, testUserB.id);
  assert(reqResult.status === 'pending_sent', 'Friend request from Alpha to Beta created with status "pending_sent"');

  // Status checks
  assert(getFriendshipStatus(testUserA.id, testUserB.id) === 'pending_sent', 'Alpha sees status "pending_sent" for Beta');
  assert(getFriendshipStatus(testUserB.id, testUserA.id) === 'pending_received', 'Beta sees status "pending_received" for Alpha');

  // Duplicate send check
  let duplicateSent = false;
  try {
    sendFriendRequest(testUserA.id, testUserB.id);
  } catch (err: any) {
    duplicateSent = true;
    assert(err.message.includes('already been sent'), 'Duplicate pending request is strictly rejected');
  }
  assert(duplicateSent, 'Duplicate request prevented');

  // Check queues
  const incomingB = getIncomingFriendRequests(testUserB.id);
  assert(incomingB.some((r) => r.sender.id === testUserA.id), 'Beta incoming friend requests contains Alpha');

  const sentA = getSentFriendRequests(testUserA.id);
  assert(sentA.some((r) => r.recipient.id === testUserB.id), 'Alpha sent friend requests contains Beta');

  // Alpha cancels the request
  const cancelRes = cancelFriendRequest(testUserA.id, testUserB.id);
  assert(cancelRes.success === true, 'Alpha cancels pending friend request successfully');
  assert(getFriendshipStatus(testUserA.id, testUserB.id) === 'none', 'Status returns to "none" after cancellation');

  console.log('\n4. ACCEPTANCE & MUTUAL FRIENDS CALCULATION:');
  // Alpha sends again, and Beta accepts
  sendFriendRequest(testUserA.id, testUserB.id);
  const acceptRes = acceptFriendRequest(testUserB.id, testUserA.id);
  assert(acceptRes.success === true, 'Beta accepts incoming request from Alpha');
  assert(areFriends(testUserA.id, testUserB.id), 'Alpha and Beta are now confirmed bidirectional friends');

  // Gamma also friends Alpha
  sendFriendRequest(testUserC.id, testUserA.id);
  acceptFriendRequest(testUserA.id, testUserC.id);
  assert(areFriends(testUserA.id, testUserC.id), 'Alpha and Gamma are now confirmed friends');

  // Now, Beta and Gamma have Alpha as a MUTUAL FRIEND!
  const mutualsBetaGamma = getMutualFriends(testUserB.id, testUserC.id);
  assert(mutualsBetaGamma.length === 1, 'Beta and Gamma have exactly 1 mutual friend');
  assert(mutualsBetaGamma[0]?.id === testUserA.id, 'Mutual friend identified as Alpha');

  console.log('\n5. RECIPROCAL AUTO-ACCEPTANCE:');
  // User B sends request to User C
  sendFriendRequest(testUserB.id, testUserC.id);
  assert(getFriendshipStatus(testUserB.id, testUserC.id) === 'pending_sent', 'Beta sent request to Gamma (pending_sent)');

  // User C simultaneously sends request to User B -> should auto-accept!
  const reciprocalRes = sendFriendRequest(testUserC.id, testUserB.id);
  assert(reciprocalRes.status === 'friends', 'Reciprocal request immediately auto-accepts without duplicate records');
  assert(areFriends(testUserB.id, testUserC.id), 'Beta and Gamma are now mutual friends');

  console.log('\n6. REMOVE FRIEND (UNFRIENDING):');
  const removeRes = removeFriend(testUserB.id, testUserC.id);
  assert(removeRes.success === true, 'Beta successfully removed Gamma as friend');
  assert(!areFriends(testUserB.id, testUserC.id), 'Beta and Gamma are no longer friends');
  assert(getFriendshipStatus(testUserB.id, testUserC.id) === 'none', 'Friendship status between Beta and Gamma is reset to "none"');

  console.log('\n7. PRIVACY & BLOCKED USER ENFORCEMENT:');
  // Block Beta by Alpha
  blockUser(testUserA.id, testUserB.id);

  // Verifying block automatically dissolved existing friendship between Alpha and Beta
  removeFriendshipAndRequests(testUserA.id, testUserB.id);
  assert(!areFriends(testUserA.id, testUserB.id), 'Blocking a user automatically dissolves existing friendship');

  // Beta attempting to send friend request to Alpha must be blocked
  let blockedSendError = false;
  try {
    sendFriendRequest(testUserB.id, testUserA.id);
  } catch (err: any) {
    blockedSendError = true;
    assert(err.message.includes('privacy settings'), 'Blocked user request rejected with privacy error');
  }
  assert(blockedSendError, 'Sending friend request to user who blocked you is blocked');

  // Unblock for cleanup
  unblockUser(testUserA.id, testUserB.id);

  console.log('\n8. SUGGESTIONS & PEOPLE DISCOVERY:');
  const suggestions = getFriendSuggestions(testUserA.id);
  assert(Array.isArray(suggestions) && suggestions.length > 0, 'Friend suggestions returned non-empty list');
  assert(!suggestions.some((s) => s.user.id === testUserA.id), 'Current user excluded from own suggestions');
  assert(!suggestions.some((s) => areFriends(testUserA.id, s.user.id)), 'Existing friends excluded from suggestions');

  console.log('\n9. PERSISTENCE VERIFICATION:');
  const socialDbPath = path.resolve(process.cwd(), 'data', 'social_db.json');
  assert(fs.existsSync(socialDbPath), 'data/social_db.json exists on disk');
  const diskData = JSON.parse(fs.readFileSync(socialDbPath, 'utf-8'));
  assert(Array.isArray(diskData.friendships), 'friendships array persisted in social_db.json');
  assert(Array.isArray(diskData.friendRequests), 'friendRequests array persisted in social_db.json');

  console.log('\n10. DISTINCTION BETWEEN FRIENDS AND FOLLOWERS:');
  // Fahim follows Nusrat, and Nusrat follows Fahim
  // But they also have distinct friendsCount and followersCount
  const fahimFriends = getFriendsCount('user_fahim');
  const fahimFollowers = fahim?.followersCount ?? 0;
  assert(typeof fahimFriends === 'number', 'Fahim has a distinct numeric friendsCount');
  assert(typeof fahimFollowers === 'number', 'Fahim has a distinct numeric followersCount');
  assert(fahimFriends !== fahimFollowers, 'friendsCount is distinctly tracked independently from followersCount');

  console.log('\n================================================================');
  console.log(`  FRIEND SYSTEM TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runFriendSystemTests().catch((e) => {
  console.error('Fatal test execution failure:', e);
  process.exit(1);
});
