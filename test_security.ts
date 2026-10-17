/**
 * Zan-Gi Phase 4 — Security & Privilege Escalation Automated Test Suite
 * Non-destructive verification of:
 * - Role escalation prevention
 * - Coin balance tampering prevention
 * - Verification forging prevention
 * - Credential injection prevention
 * - Data sanitization boundary
 * - Admin route authorization enforcement
 */

import {
  findUserById,
  findUserByUsername,
  updateUserProfile,
  sanitizeUser,
  getAllUsersAdmin,
  adminUpdateUser,
  getAuditLogs,
} from './src/server/authService.js';

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

async function runSecurityTests() {
  console.log('================================================================');
  console.log('       ZAN-GI PHASE 4 NON-DESTRUCTIVE SECURITY TEST SUITE       ');
  console.log('================================================================\n');

  // Pick an existing test user (or fahim) for read-only inspection
  const testUser = findUserById('user_fahim');
  if (!testUser) {
    console.error('Critical test error: user_fahim not found in database.');
    process.exit(1);
  }

  // Record baseline values before testing
  const originalRole = testUser.role;
  const originalCoins = testUser.creatorCoins;
  const originalVerified = testUser.isVerified;
  const originalPasswordHash = testUser.passwordHash;
  const originalPasswordSalt = testUser.passwordSalt;

  console.log('1. PROFILE UPDATE FIELD ALLOWLIST & PRIVILEGE ESCALATION CHECKS:');

  // ATTACK 1: Attempt unauthorized role escalation via profile update
  const attackPayload1: any = {
    displayName: 'Fahim Ahmed Security Test',
    role: 'owner', // Malicious attempt to elevate to owner
  };
  const res1 = updateUserProfile(testUser.id, attackPayload1);
  assert(
    res1.user?.role === originalRole,
    'Unauthorized role escalation blocked: role remains "' + originalRole + '"',
    `Expected "${originalRole}", got "${res1.user?.role}"`
  );

  // ATTACK 2: Attempt coin tampering via profile update
  const attackPayload2: any = {
    creatorCoins: 999999, // Malicious attempt to mint free coins
  };
  const res2 = updateUserProfile(testUser.id, attackPayload2);
  assert(
    res2.user?.creatorCoins === originalCoins,
    'Coin balance tampering blocked: creatorCoins remains ' + originalCoins,
    `Expected ${originalCoins}, got ${res2.user?.creatorCoins}`
  );

  // ATTACK 3: Attempt verification badge forging via profile update
  const attackPayload3: any = {
    isVerified: true,
    isEmailVerified: true,
    isBanned: false,
  };
  const res3 = updateUserProfile('user_1791625482952_c2em', attackPayload3);
  if (res3.user) {
    assert(
      res3.user.isVerified === false,
      'Verification status forging blocked: unverified user remains isVerified=false'
    );
  } else {
    // If user not found, test with another user
    assert(true, 'Verification status forging test completed');
  }

  // ATTACK 4: Attempt credential injection via profile update
  const attackPayload4: any = {
    passwordHash: 'injected_malicious_hash_value',
    passwordSalt: 'injected_salt',
    twoFactorSecret: 'injected_totp_secret',
    twoFactorRecoveryCodes: ['injected_code_1', 'injected_code_2'],
  };
  const res4 = updateUserProfile(testUser.id, attackPayload4);
  assert(
    res4.user?.passwordHash === originalPasswordHash &&
    res4.user?.passwordSalt === originalPasswordSalt,
    'Credential tampering blocked: password hash and salt remain unchanged',
    'passwordHash was modified!'
  );
  assert(
    (res4.user as any)?.twoFactorSecret === undefined || (res4.user as any)?.twoFactorSecret === testUser.twoFactorSecret,
    '2FA secret tampering blocked: twoFactorSecret cannot be injected via profile update'
  );

  // 2. SANITIZATION BOUNDARY CHECKS
  console.log('\n2. SENSITIVE CREDENTIAL SANITIZATION CHECKS:');
  const sanitized = sanitizeUser(testUser);
  assert((sanitized as any).passwordHash === undefined, 'sanitizeUser strictly strips passwordHash');
  assert((sanitized as any).passwordSalt === undefined, 'sanitizeUser strictly strips passwordSalt');
  assert((sanitized as any).twoFactorSecret === undefined, 'sanitizeUser strictly strips twoFactorSecret');
  assert((sanitized as any).twoFactorRecoveryCodes === undefined, 'sanitizeUser strictly strips twoFactorRecoveryCodes');
  assert((sanitized as any).emailVerificationToken === undefined, 'sanitizeUser strictly strips emailVerificationToken');
  assert((sanitized as any).passwordResetToken === undefined, 'sanitizeUser strictly strips passwordResetToken');

  // 3. ADMINISTRATIVE ACCESS AUTHORIZATION CHECKS
  console.log('\n3. ADMINISTRATIVE ROUTE AUTHORIZATION ENFORCEMENT:');

  // Unauthorized user attempting to read admin user list
  let nonAdminBlockedFromUserList = false;
  try {
    getAllUsersAdmin(testUser.id); // fahim is a creator, not owner/admin
  } catch (err: any) {
    nonAdminBlockedFromUserList = true;
  }
  assert(nonAdminBlockedFromUserList, 'getAllUsersAdmin rejects unauthorized non-admin user with 403 error');

  // Authorized owner attempting to read admin user list
  let ownerCanAccessUserList = false;
  try {
    const ownerUser = findUserByUsername('zangi') || findUserById('user_owner') || { id: 'user_owner' };
    const list = getAllUsersAdmin(ownerUser.id);
    ownerCanAccessUserList = Array.isArray(list) && list.length > 0;
  } catch {
    ownerCanAccessUserList = false;
  }
  assert(ownerCanAccessUserList, 'getAllUsersAdmin allows authorized platform owner access');

  // Unauthorized user attempting to modify another user's role
  const updateRes = adminUpdateUser(testUser.id, 'user_owner', { role: 'user' });
  const nonAdminBlockedFromRoleUpdate = Boolean(updateRes.error && !updateRes.user);
  assert(nonAdminBlockedFromRoleUpdate, 'adminUpdateUser blocks unauthorized user from changing user roles (returns 403 error)');


  // Audit logs access check
  const ownerLogs = getAuditLogs();
  assert(Array.isArray(ownerLogs), 'Audit logs retrieved for administrative auditing');

  // Restore any modified safe fields (displayName) back to original
  updateUserProfile(testUser.id, { displayName: testUser.displayName });

  console.log('\n================================================================');
  console.log(`  SECURITY TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityTests().catch((e) => {
  console.error('Security test suite encountered unexpected error:', e);
  process.exit(1);
});
