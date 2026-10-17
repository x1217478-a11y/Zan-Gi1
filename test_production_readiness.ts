/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ZAN-GI COMPLETE PRODUCTION READINESS & DEMO-TO-REAL VERIFICATION TEST SUITE
 */

import {
  verifyAndClaimRewardedAd,
  recordLedgerEarning,
  requestCreatorWithdrawal,
  updateWithdrawalStatusAdmin,
  transferCoinTip,
  getCreatorMonetizationSummary,
  calculateRevenueSplit,
  getMonetizationConfig,
} from './src/server/monetizationStore.js';
import {
  registerUser,
  loginUser,
  findUserById,
  findUserByUsername,
  updateUserCoins,
  deleteUserAccount,
} from './src/server/authService.js';
import {
  createScheduledPost,
  checkAndPublishScheduledPosts,
  getScheduledPosts,
  getAllPosts,
  cascadeDeleteUserData,
} from './src/server/socialStore.js';
import fs from 'fs';
import path from 'path';

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedCount++;
  }
}

async function runProductionReadinessTests() {
  console.log('================================================================');
  console.log('       ZAN-GI COMPREHENSIVE PRODUCTION READINESS AUDIT SUITE    ');
  console.log('================================================================');

  // Create clean test users for isolated testing
  const ts = Date.now();
  const testCreator = registerUser({
    email: `creator_${ts}@zangi.app`,
    username: `creator_${ts}`,
    displayName: 'Production Test Creator',
    password: 'SecurePassword123!',
    ip: '127.0.0.1',
  }).user!;

  const testRecipient = registerUser({
    email: `recipient_${ts}@zangi.app`,
    username: `recipient_${ts}`,
    displayName: 'Test Recipient Creator',
    password: 'SecurePassword123!',
    ip: '127.0.0.1',
  }).user!;

  const ownerCandidate = findUserByUsername('zangi') || findUserById('user_owner');
  const testOwner = (ownerCandidate && (ownerCandidate.role === 'owner' || ownerCandidate.role === 'admin'))
    ? ownerCandidate
    : registerUser({
        email: `owner_${ts}@zangi.app`,
        username: `owner_${ts}`,
        displayName: 'Platform Owner',
        password: 'AdminPassword123!',
        ip: '127.0.0.1',
      }).user!;

  console.log('\n1. REWARDED ADS SERVER-SIDE VERIFICATION (SSV) & LEDGER AUDIT:');
  {
    // A. Unauthenticated claim is rejected
    const unauthClaim = verifyAndClaimRewardedAd({
      userId: '',
      clientTransactionId: `tx_unauth_${ts}`,
      adUnitId: 'ca-app-pub-3940256099942544/5224354917',
    });
    assert(!unauthClaim.success && unauthClaim.status === 401, 'Unauthenticated reward claim is rejected with HTTP 401');

    // B. Authentic first claim succeeds
    const tx1 = `tx_ssv_valid_1_${ts}`;
    const initialCoins = testCreator.creatorCoins || 0;
    const validClaim = verifyAndClaimRewardedAd({
      userId: testCreator.id,
      clientTransactionId: tx1,
      adUnitId: 'ca-app-pub-3940256099942544/5224354917',
      durationWatchedSeconds: 15,
      providerSignature: `sig_admob_test_${tx1}`,
    });
    assert(validClaim.success, 'Valid SSV claim succeeds and issues server verification response');
    assert(validClaim.entry?.coinsAmount === 50, 'Credits exact 50 Creator Coins configured for rewarded ad');
    assert(validClaim.entry?.creatorAmountCents === 35, 'Preserves 70% creator share (35 cents from 50 cents gross)');

    // C. Anti-Replay: Duplicate claim with same transaction ID is strictly rejected
    const replayClaim = verifyAndClaimRewardedAd({
      userId: testCreator.id,
      clientTransactionId: tx1,
      adUnitId: 'ca-app-pub-3940256099942544/5224354917',
      durationWatchedSeconds: 15,
      providerSignature: `sig_admob_test_${tx1}`,
    });
    assert(!replayClaim.success && replayClaim.status === 409, 'Replay attack strictly blocked with HTTP 409 duplicate claim error');

    // D. Anti-Abuse: Immediate next claim before cooldown expires is rejected
    const rapidClaim = verifyAndClaimRewardedAd({
      userId: testCreator.id,
      clientTransactionId: `tx_ssv_rapid_${ts}`,
      adUnitId: 'ca-app-pub-3940256099942544/5224354917',
      durationWatchedSeconds: 15,
      providerSignature: `sig_admob_test_rapid`,
    });
    assert(!rapidClaim.success && rapidClaim.status === 429, 'Cooldown violation strictly blocked with HTTP 429 cooldown active error');

    // E. Revenue split & tax accounting test
    const split = calculateRevenueSplit(100);
    assert(split.creatorAmountCents === 70, 'Revenue split guarantees exactly 70% creator allocation');
    assert(split.platformAmountCents === 30, 'Revenue split guarantees exactly 30% platform allocation');
    assert(split.creatorAmountCents + split.platformAmountCents === 100, 'Distributable revenue sum strictly equals 100%');
    assert(split.taxAmountCents === 1, '2% VAT calculated on platform taxable service base (30 cents * 2% = 0.6 round to 1 cent)');
  }

  console.log('\n2. WITHDRAWAL & AUDITABLE MANUAL DISBURSEMENT LIFECYCLE:');
  {
    // Give test creator sufficient coins and ledger earnings for withdrawal testing ($400.00 = 40,000 cents)
    recordLedgerEarning(testCreator.id, 40000, 'Test Creator Starting Earnings');
    updateUserCoins(testCreator.id, 40000);

    // A. Submit valid bKash withdrawal request ($150.00 = 15,000 cents, exceeding $100 minimum)
    const withdrawReq = requestCreatorWithdrawal({
      userId: testCreator.id,
      amountCents: 15000,
      payoutProvider: 'bkash',
      accountDetails: {
        accountIdentifierMasked: '01712-345678',
        accountHolderName: 'Production Test Creator',
      },
    });
    assert(withdrawReq.success && withdrawReq.withdrawal !== undefined, 'bKash withdrawal request accepted in pending status');
    const withdrawalId = withdrawReq.withdrawal!.id;

    // B. Check balance reservation
    const creatorAfterReq = findUserById(testCreator.id)!;
    assert(creatorAfterReq.creatorCoins === 25000, 'Withdrawal amount reserved: 15,000 coins held from active wallet');

    // C. Admin Pre-Disbursement Approval (status -> approved)
    const approveResult = updateWithdrawalStatusAdmin(
      testOwner.id,
      withdrawalId,
      'approved',
      'Account details verified by finance officer',
      undefined
    );
    assert(approveResult.success && approveResult.withdrawal?.status === 'approved', 'Admin review advances request to "approved" (pre-disbursement passed)');

    // D. Attempting to mark as paid WITHOUT authentic TrxID is rejected
    const unrecordedDisburse = updateWithdrawalStatusAdmin(
      testOwner.id,
      withdrawalId,
      'paid',
      'Disbursed',
      undefined,
      '' // Missing TrxID
    );
    assert(!unrecordedDisburse.success, 'Marking payout as paid WITHOUT authentic TrxID is strictly rejected');

    // E. Authentic Manual Disbursement with real provider TrxID succeeds
    const authenticTrxId = `BK_TEST_TRX_${ts}_99`;
    const recordedDisburse = updateWithdrawalStatusAdmin(
      testOwner.id,
      withdrawalId,
      'paid',
      'Disbursed through corporate bKash merchant gateway',
      undefined,
      authenticTrxId
    );
    assert(recordedDisburse.success && recordedDisburse.withdrawal?.status === 'paid', 'Marking payout as paid WITH authentic TrxID succeeds and records audit reference');
    assert(recordedDisburse.withdrawal?.transactionReference === authenticTrxId, 'Payout transaction reference strictly stored in withdrawal record');

    // F. Rejection & Refund lifecycle
    // Request a second withdrawal for rejection test ($100.00 = 10,000 cents satisfies $100 minimum)
    const secondReq = requestCreatorWithdrawal({
      userId: testCreator.id,
      amountCents: 10000,
      payoutProvider: 'nagad',
      accountDetails: {
        accountIdentifierMasked: '01812-987654',
        accountHolderName: 'Mismatch Name',
      },
    });
    assert(secondReq.success, 'Second withdrawal created for rejection verification');
    const secondId = secondReq.withdrawal!.id;

    // Rejecting without documented reason is rejected
    const noReasonReject = updateWithdrawalStatusAdmin(
      testOwner.id,
      secondId,
      'rejected',
      'Notes',
      '' // Empty reason
    );
    assert(!noReasonReject.success, 'Rejecting payout without documented reason is rejected');

    // Rejecting with reason refunds held coins back to creator
    const rejectWithReason = updateWithdrawalStatusAdmin(
      testOwner.id,
      secondId,
      'rejected',
      'Rejected by admin',
      'Nagad account name mismatch with user NID'
    );
    assert(rejectWithReason.success && rejectWithReason.withdrawal?.status === 'rejected', 'Payout rejected with documented reason');

    const creatorAfterReject = findUserById(testCreator.id)!;
    assert(creatorAfterReject.creatorCoins === 25000, 'Held coins strictly refunded back to creator wallet upon rejection');

    // G. Unauthorized user cannot update withdrawal status
    try {
      updateWithdrawalStatusAdmin(testCreator.id, withdrawalId, 'rejected', 'notes', 'reason');
      assert(false, 'Non-admin user cannot modify withdrawal status');
    } catch {
      assert(true, 'Unauthorized non-admin user strictly blocked from updating withdrawal status (throws unauthorized)');
    }
  }

  console.log('\n3. SCHEDULED POSTS DURABILITY & RETRY RECOVERY:');
  {
    // A. Create scheduled post due in the future
    const futureTime = new Date(Date.now() + 3600 * 1000).toISOString();
    const futurePost = createScheduledPost({
      authorId: testCreator.id,
      content: 'Scheduled future post test',
      postType: 'text',
      scheduledAt: futureTime,
      hashtags: ['FutureSchedule'],
    });
    assert(futurePost.status === 'pending', 'Scheduled post due in future initializes in pending status');

    // B. Check that running publisher does not publish future post prematurely
    const countEarly = checkAndPublishScheduledPosts();
    assert(countEarly === 0, 'Publisher does not prematurely publish posts scheduled in future');

    // C. Create scheduled post due in the past (simulating server sleep/recovery)
    const pastTime = new Date(Date.now() - 60 * 1000).toISOString();
    const pastPost = createScheduledPost({
      authorId: testCreator.id,
      content: 'Due scheduled post recovery test',
      postType: 'text',
      scheduledAt: pastTime,
      hashtags: ['RecoveryTest'],
    });
    assert(pastPost.status === 'pending', 'Due scheduled post created in pending status');

    // D. Running publisher publishes the due post
    const publishedCount = checkAndPublishScheduledPosts();
    assert(publishedCount >= 1, 'Publisher successfully publishes past-due scheduled post');

    const scheduledList = getScheduledPosts(testCreator.id);
    const publishedItem = scheduledList.find((p) => p.id === pastPost.id);
    assert(publishedItem?.status === 'published', 'Published item status transitions to "published" with publishedPostId');
    assert(Boolean(publishedItem?.publishedPostId), 'Published item contains valid persistent publishedPostId');
  }

  console.log('\n4. SOCIAL COIN TIPPING & FINANCIAL LEDGER INTEGRATION:');
  {
    updateUserCoins(testCreator.id, 500);
    updateUserCoins(testRecipient.id, 100);

    // A. Self-tipping is rejected
    const selfTip = transferCoinTip({
      senderId: testCreator.id,
      recipientId: testCreator.id,
      coinsAmount: 50,
    });
    assert(!selfTip.success, 'Self-tipping is strictly rejected');

    // B. Insufficient balance is rejected
    const excessiveTip = transferCoinTip({
      senderId: testCreator.id,
      recipientId: testRecipient.id,
      coinsAmount: 1000,
    });
    assert(!excessiveTip.success, 'Tipping exceeding available coin balance is strictly rejected');

    // C. Valid tip transfer
    const validTip = transferCoinTip({
      senderId: testCreator.id,
      recipientId: testRecipient.id,
      coinsAmount: 50,
      note: 'Great animation video!',
    });
    assert(validTip.success, 'Valid coin tip succeeds and transfers coins between creators');
    assert(validTip.senderCoins === 450, 'Sender coin balance accurately deducted (-50 coins)');
    assert(validTip.recipientCoins === 150, 'Recipient coin balance accurately credited (+50 coins)');

    // Verify persistence in user store
    const updatedSender = findUserById(testCreator.id)!;
    const updatedRecipient = findUserById(testRecipient.id)!;
    assert(updatedSender.creatorCoins === 450, 'Persistent sender wallet updated in database');
    assert(updatedRecipient.creatorCoins === 150, 'Persistent recipient wallet updated in database');
  }

  console.log('\n5. CODEBASE HYGIENE & RUNTIME ENVIRONMENT CONSTRAINTS:');
  {
    // Search for window.alert in src/ directory
    const srcDir = path.resolve(process.cwd(), 'src');
    let alertOccurrences = 0;

    function scanFiles(dir: string) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          scanFiles(fullPath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          const matches = content.match(/\balert\s*\(/g);
          if (matches) {
            alertOccurrences += matches.length;
          }
        }
      }
    }
    scanFiles(srcDir);
    assert(alertOccurrences === 0, 'Zero window.alert() calls in src/ codebase (satisfies AI Studio iframe constraints)');
    // Clean up transient test users and their data to keep databases pristine
    cascadeDeleteUserData(testCreator.id);
    deleteUserAccount(testCreator.id, 'SecurePassword123!');
    cascadeDeleteUserData(testRecipient.id);
    deleteUserAccount(testRecipient.id, 'SecurePassword123!');
  }

  console.log('\n================================================================');
  console.log(`  AUDIT SUITE COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('================================================================');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runProductionReadinessTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
