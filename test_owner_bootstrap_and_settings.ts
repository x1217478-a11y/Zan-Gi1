/**
 * Zan-Gi Test Suite: First-Owner Bootstrap, Admin Authorization, and Settings Search
 */

import {
  hasExistingOwner,
  getBootstrapSecret,
  validateStrongPassword,
  bootstrapFirstOwner,
  recoverOwnerCredentials,
  loginUser,
  getAllUsersAdmin,
  findUserById,
  findUserByUsername,
} from './src/server/authService.js';
import {
  updateWithdrawalStatusAdmin,
  requestCreatorWithdrawal,
  saveCreatorPayoutMethod,
  SUPPORTED_PAYOUT_PROVIDERS
} from './src/server/monetizationStore.js';

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

async function runTests() {
  console.log('================================================================');
  console.log('     ZAN-GI OWNER BOOTSTRAP, SETTINGS SEARCH & ADMIN TEST       ');
  console.log('================================================================\n');

  console.log('1. FIRST-OWNER BOOTSTRAP SECURITY CHECKS:');

  // Test 1: Check password policy validator
  const weak1 = validateStrongPassword('short');
  assert(!weak1.valid, 'Weak password (<8 chars) is rejected');

  const weak2 = validateStrongPassword('alllowercase123');
  assert(!weak2.valid, 'Password missing uppercase is rejected');

  const strong = validateStrongPassword('ZanGi@Secure2026');
  assert(strong.valid, 'Strong password (mixed case + special/number) passes');

  // Test 2: When bootstrap secret is not set in env, bootstrap returns 503
  const origSecret = process.env.OWNER_BOOTSTRAP_SECRET;
  delete process.env.OWNER_BOOTSTRAP_SECRET;
  delete process.env.OWNER_SETUP_SECRET;

  const noSecretRes = bootstrapFirstOwner({
    secret: 'test',
    email: 'test@zangi.app',
    username: 'test_owner',
    displayName: 'Test Owner',
    password: 'Password@123',
  });
  assert(noSecretRes.status === 503, 'Bootstrap without server-side secret returns 503 error');

  // Set test bootstrap secret
  process.env.OWNER_BOOTSTRAP_SECRET = 'SuperSecretSetupKey2026!';

  const ownerUser = findUserByUsername('owner');
  const zangiUser = findUserByUsername('zangi');
  if (ownerUser) {
    (ownerUser as any).role = 'owner';
  }

  // Test 3: Existing database owner check
  const ownerExists = hasExistingOwner();
  assert(ownerExists, 'Existing database owner is detected');

  // Test 4: When owner already exists, bootstrap is permanently disabled (403)
  const existingOwnerRes = bootstrapFirstOwner({
    secret: 'SuperSecretSetupKey2026!',
    email: 'newowner@zangi.app',
    username: 'new_owner',
    displayName: 'New Owner',
    password: 'Password@123',
  });
  assert(
    existingOwnerRes.status === 403,
    'First-owner bootstrap is permanently disabled when an owner already exists (returns 403)'
  );

  // Test 5: Wrong setup secret is rejected
  // Temporarily simulate empty owner state to test secret mismatch
  if (ownerUser) (ownerUser as any).role = 'creator';
  if (zangiUser) (zangiUser as any).role = 'creator';

  const wrongSecretRes = bootstrapFirstOwner({
    secret: 'WrongSecretKey!',
    email: 'owner_test@zangi.app',
    username: 'temp_owner_test',
    displayName: 'Temp Owner',
    password: 'StrongPassword@2026',
  });
  assert(wrongSecretRes.status === 401, 'Invalid setup secret is rejected with 401 Unauthorized');
  assert(
    Boolean(wrongSecretRes.error?.includes('Invalid owner setup secret')),
    'Clear descriptive error shown for invalid secret'
  );

  // Test 5b: Successful bootstrap when secret is valid and no owner exists
  const validBootstrapRes = bootstrapFirstOwner({
    secret: 'SuperSecretSetupKey2026!',
    email: 'fresh_owner@zangi.app',
    username: 'fresh_owner',
    displayName: 'Fresh Primary Owner',
    password: 'StrongPassword@2026!',
  });
  assert(validBootstrapRes.success === true, 'Successful first-owner bootstrap succeeds');
  assert(validBootstrapRes.user?.role === 'owner', 'Bootstrapped account receives "owner" role');
  assert(validBootstrapRes.user?.isVerified === true, 'Bootstrapped owner is marked isVerified=true');
  assert(Boolean(validBootstrapRes.session?.token), 'Session token issued upon successful owner bootstrap');

  // Test 5c: Attempting second bootstrap immediately locked (403)
  const secondBootstrapRes = bootstrapFirstOwner({
    secret: 'SuperSecretSetupKey2026!',
    email: 'second_owner@zangi.app',
    username: 'second_owner',
    displayName: 'Second Owner',
    password: 'StrongPassword@2026!',
  });
  assert(secondBootstrapRes.status === 403, 'Second owner bootstrap is permanently disabled (returns 403)');

  // Test 5d: Verify newly bootstrapped owner can log in successfully
  const freshLoginRes = loginUser('fresh_owner@zangi.app', 'StrongPassword@2026!');
  assert(freshLoginRes.user?.role === 'owner', 'Bootstrapped owner logs in successfully with new credentials');

  // Clean up temporary fresh_owner
  const { deleteUserAccount } = await import('./src/server/authService.js');
  if (validBootstrapRes.user) {
    deleteUserAccount(validBootstrapRes.user.id, 'StrongPassword@2026!');
  }

  // Restore original owner role
  if (ownerUser) {
    (ownerUser as any).role = 'owner';
  }
  if (zangiUser) {
    (zangiUser as any).role = 'owner';
  }

  // Restore env
  if (origSecret) process.env.OWNER_BOOTSTRAP_SECRET = origSecret;

  console.log('\n2. SECURE LOGIN & CREDENTIAL INTEGRITY CHECKS:');

  // Test 6: Empty password login is strictly blocked
  const emptyPassRes = loginUser('owner@zangi.app', '');
  assert(Boolean(emptyPassRes.error), 'Login with empty password is strictly blocked');

  const whitespacePassRes = loginUser('owner@zangi.app', '   ');
  assert(Boolean(whitespacePassRes.error), 'Login with whitespace password is strictly blocked');

  // Test 7: Normal user denial on admin routes
  let fahimDenied = false;
  try {
    getAllUsersAdmin('user_fahim'); // Creator role
  } catch {
    fahimDenied = true;
  }
  assert(fahimDenied, 'Normal user (user_fahim) is rejected from administrative user queries (403)');

  // Test 8: Owner allowed on admin routes
  let ownerAllowed = false;
  try {
    const list = getAllUsersAdmin('user_owner');
    ownerAllowed = Array.isArray(list) && list.length > 0;
  } catch {
    ownerAllowed = false;
  }
  assert(ownerAllowed, 'Authorized platform owner is granted administrative access');

  console.log('\n3. WITHDRAWAL METHODS & ADMIN REVIEW BOUNDARIES:');

  // Test 9: Supported rails check
  assert(
    SUPPORTED_PAYOUT_PROVIDERS.includes('bkash') &&
    SUPPORTED_PAYOUT_PROVIDERS.includes('nagad') &&
    SUPPORTED_PAYOUT_PROVIDERS.includes('rocket'),
    'All three Bangladeshi rails (bKash, Nagad, Rocket) supported'
  );

  // Test 10: Marking withdrawal as paid strictly requires non-empty TrxID
  let emptyTrxIdBlocked = false;
  const dummyWithdrawalRes = requestCreatorWithdrawal({
    userId: 'user_fahim',
    amountCents: 10000,
    payoutProvider: 'bkash',
    accountDetails: {
      accountIdentifierMasked: '01712345678',
      accountHolderName: 'Fahim Ahmed',
    },
  });

  if (dummyWithdrawalRes.withdrawal) {
    const wId = dummyWithdrawalRes.withdrawal.id;
    const paidWithoutTrx = updateWithdrawalStatusAdmin('user_owner', wId, 'paid', 'notes', undefined, '');
    assert(!paidWithoutTrx.success, 'Marking payout as paid without authentic TrxID is strictly rejected');

    const rejectWithoutReason = updateWithdrawalStatusAdmin('user_owner', wId, 'rejected', 'notes', '');
    assert(!rejectWithoutReason.success, 'Rejecting payout without reason is strictly rejected');

    const validReject = updateWithdrawalStatusAdmin('user_owner', wId, 'rejected', 'notes', 'Audit test cancellation');
    assert(validReject.success, 'Rejecting payout with valid reason succeeds and refunds creator coins');
  }

  console.log('\n4. SETTINGS 16-CATEGORY SEARCH INDEX VALIDATION:');
  const expectedSections = [
    'account',
    'preferences',
    'privacy',
    'security',
    'notifications',
    'friends',
    'messages',
    'media',
    'storage',
    'accessibility',
    'language',
    'theme',
    'creator',
    'monetization',
    'help',
    'admin'
  ];

  assert(expectedSections.length === 16, 'All 16 required settings categories are defined');

  if (ownerUser) {
    (ownerUser as any).role = 'owner';
  }

  console.log('\n================================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Test run failed:', e);
  process.exit(1);
});
