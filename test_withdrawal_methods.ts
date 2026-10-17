/**
 * Automated Regression Test Suite for Zan-Gi Withdrawal Methods
 * Verifies strict enforcement of the three-method allowlist:
 * 1. bKash (ALLOWED)
 * 2. Nagad (ALLOWED)
 * 3. Rocket (ALLOWED)
 * All other methods (Bank Wire, PayPal, Crypto, etc.) must be REJECTED with 400.
 */

import {
  requestCreatorWithdrawal,
  saveCreatorPayoutMethod,
  getCreatorMonetizationSummary,
  SUPPORTED_PAYOUT_PROVIDERS,
  recordLedgerEarning
} from './src/server/monetizationStore.js';
import { findUserById, updateUserCoins } from './src/server/authService.js';

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

async function runWithdrawalTests() {
  console.log('================================================================');
  console.log('     ZAN-GI FINAL WITHDRAWAL METHODS ALLOWLIST TEST SUITE       ');
  console.log('================================================================\n');

  // Ensure test user fahim has enough coins and available balance for testing
  const testUserId = 'user_fahim';
  const userBefore = findUserById(testUserId);
  if (!userBefore) {
    console.error('Test user user_fahim not found!');
    process.exit(1);
  }

  // Record a credit earning so user has plenty of available balance for $100+ tests ($800.00 = 80,000 cents)
  recordLedgerEarning(testUserId, 80000, 'Test Fund Deposit for Withdrawal Suite');
  updateUserCoins(testUserId, 80000);

  console.log('1. ALLOWLIST CONSTANT DEFINITION:');
  assert(
    SUPPORTED_PAYOUT_PROVIDERS.length === 3 &&
    SUPPORTED_PAYOUT_PROVIDERS.includes('bkash') &&
    SUPPORTED_PAYOUT_PROVIDERS.includes('nagad') &&
    SUPPORTED_PAYOUT_PROVIDERS.includes('rocket'),
    'SUPPORTED_PAYOUT_PROVIDERS strictly equals ["bkash", "nagad", "rocket"]'
  );
  assert(
    !(SUPPORTED_PAYOUT_PROVIDERS as any).includes('bank') &&
    !(SUPPORTED_PAYOUT_PROVIDERS as any).includes('paypal'),
    'SUPPORTED_PAYOUT_PROVIDERS strictly excludes "bank" and "paypal"'
  );

  console.log('\n2. $100 MINIMUM WITHDRAWAL BOUNDARY & ALLOWED METHODS:');

  // TEST: Boundary below $100 ($99.99 = 9999 cents) strictly rejected
  const belowBoundaryRes = requestCreatorWithdrawal({
    userId: testUserId,
    amountCents: 9999, // $99.99 (below $100 minimum)
    payoutProvider: 'bkash',
    accountDetails: {
      accountIdentifierMasked: '01712-***456',
      accountHolderName: 'Fahim Ahmed'
    }
  });
  assert(
    belowBoundaryRes.success === false && belowBoundaryRes.status === 400,
    'Withdrawal below $100 minimum ($99.99 / 9999 cents) is strictly REJECTED (HTTP 400)',
    belowBoundaryRes.error
  );

  // TEST: Boundary exactly at $100 ($100.00 = 10000 cents) accepted for bKash
  const bkashRes = requestCreatorWithdrawal({
    userId: testUserId,
    amountCents: 10000, // $100.00 exact minimum
    payoutProvider: 'bkash',
    accountDetails: {
      accountIdentifierMasked: '01712-***456',
      accountHolderName: 'Fahim Ahmed'
    }
  });
  assert(
    bkashRes.success === true && bkashRes.withdrawal?.payoutMethod === 'bkash',
    'bKash withdrawal request at exact $100.00 boundary (10,000 cents) is ACCEPTED in pending status',
    bkashRes.error
  );

  // TEST: Boundary above $100 ($100.01 = 10001 cents) accepted for Rocket
  const rocketRes = requestCreatorWithdrawal({
    userId: testUserId,
    amountCents: 10001, // $100.01
    payoutProvider: 'rocket',
    accountDetails: {
      accountIdentifierMasked: '01712-***456-7',
      accountHolderName: 'Fahim Ahmed'
    }
  });
  assert(
    rocketRes.success === true && rocketRes.withdrawal?.payoutMethod === 'rocket',
    'Rocket withdrawal request at $100.01 (10,001 cents) is ACCEPTED in pending status',
    rocketRes.error
  );

  // TEST: Nagad request ($100.00) accepted
  const nagadRes = requestCreatorWithdrawal({
    userId: testUserId,
    amountCents: 10000,
    payoutProvider: 'nagad',
    accountDetails: {
      accountIdentifierMasked: '01819-***890',
      accountHolderName: 'Fahim Ahmed'
    }
  });
  assert(
    nagadRes.success === true && nagadRes.withdrawal?.payoutMethod === 'nagad',
    'Nagad withdrawal request ($100.00) is ACCEPTED in pending status',
    nagadRes.error
  );

  console.log('\n3. REJECTION OF UNSUPPORTED METHODS (Bank Wire, PayPal, Others):');

  const coinsBeforeUnauthorized = findUserById(testUserId)?.creatorCoins || 0;

  // TEST: Bank Wire rejection
  const bankRes = requestCreatorWithdrawal({
    userId: testUserId,
    amountCents: 1000,
    payoutProvider: 'bank' as any,
    accountDetails: {
      accountIdentifierMasked: 'acc_****9123',
      accountHolderName: 'Fahim Ahmed'
    }
  });
  assert(
    bankRes.success === false && bankRes.status === 400,
    'Bank Transfer / Wire withdrawal request is strictly REJECTED (HTTP 400)',
    `Status: ${bankRes.status}`
  );
  assert(
    Boolean(bankRes.error && bankRes.error.includes('Unsupported withdrawal method')),
    'Rejection message explicitly specifies only bKash, Nagad, and Rocket are supported',
    bankRes.error
  );

  // TEST: PayPal rejection
  const paypalRes = requestCreatorWithdrawal({
    userId: testUserId,
    amountCents: 1000,
    payoutProvider: 'paypal' as any,
    accountDetails: {
      accountIdentifierMasked: 'fahim***@paypal.com',
      accountHolderName: 'Fahim Ahmed'
    }
  });
  assert(
    paypalRes.success === false && paypalRes.status === 400,
    'PayPal withdrawal request is strictly REJECTED (HTTP 400)',
    `Status: ${paypalRes.status}`
  );

  // TEST: Random arbitrary provider rejection
  const cryptoRes = requestCreatorWithdrawal({
    userId: testUserId,
    amountCents: 1000,
    payoutProvider: 'crypto_usdt' as any,
    accountDetails: {
      accountIdentifierMasked: '0x123...456',
      accountHolderName: 'Fahim Ahmed'
    }
  });
  assert(
    cryptoRes.success === false && cryptoRes.status === 400,
    'Arbitrary unapproved payment methods (e.g. crypto) are strictly REJECTED (HTTP 400)'
  );

  // Verify zero coins were deducted on rejected attempts
  const coinsAfterUnauthorized = findUserById(testUserId)?.creatorCoins || 0;
  assert(
    coinsBeforeUnauthorized === coinsAfterUnauthorized,
    'Zero coins deducted from creator wallet when unsupported methods are rejected'
  );

  console.log('\n4. SAVED PAYOUT METHODS STORE & ALLOWLIST ENFORCEMENT:');

  // TEST: Saving bKash method
  const saveBkash = saveCreatorPayoutMethod(testUserId, {
    provider: 'bkash',
    accountIdentifierMasked: '01712-***777',
    accountHolderName: 'Fahim Ahmed'
  });
  assert(
    saveBkash.some((m) => m.provider === 'bkash'),
    'saveCreatorPayoutMethod accepts valid bKash account'
  );

  // TEST: Saving Rocket method
  const saveRocket = saveCreatorPayoutMethod(testUserId, {
    provider: 'rocket',
    accountIdentifierMasked: '01712-***777-9',
    accountHolderName: 'Fahim Ahmed'
  });
  assert(
    saveRocket.some((m) => m.provider === 'rocket'),
    'saveCreatorPayoutMethod accepts valid Rocket account'
  );

  // TEST: Saving Nagad method
  const saveNagad = saveCreatorPayoutMethod(testUserId, {
    provider: 'nagad',
    accountIdentifierMasked: '01812-***888',
    accountHolderName: 'Fahim Ahmed'
  });
  assert(
    saveNagad.some((m) => m.provider === 'nagad'),
    'saveCreatorPayoutMethod accepts valid Nagad account'
  );

  // TEST: Saving Bank method fails
  let bankSaveThrew = false;
  try {
    saveCreatorPayoutMethod(testUserId, {
      provider: 'bank' as any,
      accountIdentifierMasked: 'acc_***444',
      accountHolderName: 'Fahim Ahmed'
    });
  } catch (err: any) {
    bankSaveThrew = true;
  }
  assert(
    bankSaveThrew,
    'saveCreatorPayoutMethod throws exception when attempting to save Bank method'
  );

  // TEST: Saving PayPal method fails
  let paypalSaveThrew = false;
  try {
    saveCreatorPayoutMethod(testUserId, {
      provider: 'paypal' as any,
      accountIdentifierMasked: 'user@paypal.me',
      accountHolderName: 'Fahim Ahmed'
    });
  } catch (err: any) {
    paypalSaveThrew = true;
  }
  assert(
    paypalSaveThrew,
    'saveCreatorPayoutMethod throws exception when attempting to save PayPal method'
  );

  console.log('\n5. CREATOR MONETIZATION SUMMARY PAYOUT METHODS FILTER:');
  const summary = getCreatorMonetizationSummary(testUserId);
  const returnedProviders = summary.payoutMethods.map((m) => m.provider);
  assert(
    returnedProviders.every((p) => (SUPPORTED_PAYOUT_PROVIDERS as any).includes(p)),
    'getCreatorMonetizationSummary returns ONLY allowed payout methods (no bank, no paypal)',
    `Returned: ${returnedProviders.join(', ')}`
  );

  console.log('\n================================================================');
  console.log(`  WITHDRAWAL METHODS TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runWithdrawalTests().catch((e) => {
  console.error('Test error:', e);
  process.exit(1);
});
