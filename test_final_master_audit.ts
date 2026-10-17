/**
 * Zan-Gi Master Final Audit Test Suite
 * Local-First Messaging, Free-Tier Safety & Full Ecosystem Verification
 */

import fs from 'fs';
import path from 'path';
import {
  registerUser,
  loginUser,
  validateSession,
  revokeSession,
  findUserById,
  getUserSessions
} from './src/server/authService.js';
import {
  sendDirectMessage,
  getConversations,
  getMessagesBetween,
  markMessagesAsRead,
  isMessageParticipantForMedia
} from './src/server/socialStore.js';
import {
  checkUploadAllowed,
  reserveUploadCapacity,
  commitUploadCapacity,
  releaseUploadCapacity,
  getR2QuotaStatus,
  checkLocalDiskAllowed,
  STORAGE_PAUSE_HARD_LIMIT_BYTES,
  CLASS_A_HALT_90_PCT,
  syncStorageFromMediaRecords,
  clearActiveReservations
} from './src/server/r2UsageTracker.js';
import {
  registerMediaRecord,
  getMediaRecordById,
  PRIVATE_MESSAGES_DIR
} from './src/server/mediaStore.js';
import {
  verifyAndClaimRewardedAd,
  requestCreatorWithdrawal,
  updateWithdrawalStatusAdmin,
  getPlatformLedgerMetricsAdmin,
  recordLedgerEarning
} from './src/server/monetizationStore.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runAudit() {
  console.log('================================================================');
  console.log('       ZAN-GI FINAL MASTER AUDIT & VERIFICATION SUITE           ');
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // 1. TWO ACCOUNTS ON TWO DEVICES: AUTHENTICATION, LOGIN, LOGOUT & SESSIONS
  // -------------------------------------------------------------------------
  console.log('1. TWO ACCOUNTS / SESSIONS (ALICE ON DEVICE 1, BOB ON DEVICE 2):');
  const ts = Date.now();
  const aliceReg = registerUser({
    username: `alice_dev_${ts}`,
    email: `alice_${ts}@example.com`,
    displayName: 'Alice Engineer',
    password: 'Password123!Secure',
    ip: '192.168.1.10',
  });
  assert(Boolean(aliceReg.user), 'Alice registered successfully on Device 1');

  const bobReg = registerUser({
    username: `bob_dev_${ts}`,
    email: `bob_${ts}@example.com`,
    displayName: 'Bob Designer',
    password: 'Password123!Secure',
    ip: '192.168.1.20',
  });
  assert(Boolean(bobReg.user), 'Bob registered successfully on Device 2');

  const aliceLogin = loginUser(aliceReg.user!.email, 'Password123!Secure', '192.168.1.10', 'Pixel 8; Android 15');
  assert(Boolean(aliceLogin.session?.token), 'Alice logged in with active session on Device 1');

  const bobLogin = loginUser(bobReg.user!.email, 'Password123!Secure', '192.168.1.20', 'Chrome Linux');
  assert(Boolean(bobLogin.session?.token), 'Bob logged in with active session on Device 2');

  // Verify sessions
  const aliceSession = validateSession(aliceLogin.session!.token);
  assert(aliceSession?.id === aliceReg.user!.id, 'Alice session verified active on Device 1');
  const bobSession = validateSession(bobLogin.session!.token);
  assert(bobSession?.id === bobReg.user!.id, 'Bob session verified active on Device 2');

  // Verify multiple active sessions tracking
  const aliceSessions = getUserSessions(aliceReg.user!.id, aliceLogin.session!.token);
  assert(aliceSessions.length >= 1, 'Alice active session indexed in session store');

  // Test secondary device login, then logout and session revocation
  const tempLogin = loginUser(aliceReg.user!.email, 'Password123!Secure', '192.168.1.15', 'Tablet App');
  assert(Boolean(tempLogin.session?.token), 'Alice logged in from secondary device');
  revokeSession(tempLogin.session!.token);
  const afterLogout = validateSession(tempLogin.session!.token);
  assert(afterLogout === null, 'Revoked session is invalid (successful logout verification)');

  // -------------------------------------------------------------------------
  // 2. OFFLINE / DEFERRED DELIVERY & PERSISTENT METADATA
  // -------------------------------------------------------------------------
  console.log('\n2. OFFLINE DELIVERY & CONVERSATION METADATA PERSISTENCE:');
  const msg1 = sendDirectMessage({
    senderId: aliceReg.user!.id,
    recipientId: bobReg.user!.id,
    text: 'Hello Bob! This message was sent while your device was backgrounded.',
  });
  assert(Boolean(msg1.id), 'Alice sent message to Bob');
  assert(msg1.isRead === false, 'Message correctly marked as unread before Bob opens chat');

  // Bob checks inbox
  const bobInbox = getConversations(bobReg.user!.id);
  const aliceConv = bobInbox.find((c) => c.partner.id === aliceReg.user!.id);
  assert(Boolean(aliceConv), 'Bob sees Alice in conversation inbox');
  assert(aliceConv?.unreadCount === 1, 'Bob inbox indicates exactly 1 unread message');
  assert(Boolean(aliceConv?.lastMessage?.text?.includes('backgrounded')), 'Conversation preview matches sent message');

  // Bob comes online and reads message
  const readCount = markMessagesAsRead(bobReg.user!.id, aliceReg.user!.id);
  assert(readCount === 1, 'markMessagesAsRead marks the deferred message as read');
  const bobInboxAfter = getConversations(bobReg.user!.id);
  const aliceConvAfter = bobInboxAfter.find((c) => c.partner.id === aliceReg.user!.id);
  assert(aliceConvAfter?.unreadCount === 0, 'Bob unread count reconciled to 0');

  // -------------------------------------------------------------------------
  // 3. PRIVATE MEDIA ATTACHMENTS & ISOLATION
  // -------------------------------------------------------------------------
  console.log('\n3. PRIVATE MESSAGE MEDIA ISOLATION & AUTHORIZATION:');
  // Create dummy staged file for private media registration
  const dummyPrivateName = `test_priv_${Date.now()}.jpg`;
  const dummyPrivatePath = path.join(PRIVATE_MESSAGES_DIR, dummyPrivateName);
  fs.writeFileSync(dummyPrivatePath, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]));

  const multerMock: any = {
    fieldname: 'files',
    originalname: 'private_vacation.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    destination: PRIVATE_MESSAGES_DIR,
    filename: dummyPrivateName,
    path: dummyPrivatePath,
    size: 2048,
  };

  const privRec = registerMediaRecord(aliceReg.user!.id, multerMock, 'image', undefined, true);
  assert(privRec.isPrivate === true, 'Media record flagged as private');
  assert(privRec.fileUrl.startsWith('/api/messages/media/'), 'Private media URL uses secure authenticated API route');

  // Attach media to message
  const mediaMsg = sendDirectMessage({
    senderId: aliceReg.user!.id,
    recipientId: bobReg.user!.id,
    text: 'Check this private image',
    imageUrl: privRec.fileUrl,
  });
  assert(Boolean(mediaMsg.id), 'Message sent with private media attachment');

  // Test participant authorization check
  const isAliceAuthorized = isMessageParticipantForMedia(privRec.id, privRec.fileUrl, aliceReg.user!.id);
  assert(isAliceAuthorized === true, 'Sender Alice is authorized to access private media');
  const isBobAuthorized = isMessageParticipantForMedia(privRec.id, privRec.fileUrl, bobReg.user!.id);
  assert(isBobAuthorized === true, 'Recipient Bob is authorized to access private media');

  // Test unauthorized third party
  const eveReg = registerUser({
    username: `eve_eavesdropper_${ts}`,
    email: `eve_${ts}@example.com`,
    displayName: 'Eve Intruder',
    password: 'Password123!Secure',
    ip: '192.168.1.99',
  });
  const isEveAuthorized = isMessageParticipantForMedia(privRec.id, privRec.fileUrl, eveReg.user!.id);
  assert(isEveAuthorized === false, 'Unauthorized user Eve is strictly blocked from private media (HTTP 403 enforcement)');

  // -------------------------------------------------------------------------
  // 4. R2 ZERO-BUDGET SAFETY & LIMIT ENFORCEMENT
  // -------------------------------------------------------------------------
  console.log('\n4. R2 FREE-TIER ZERO-BUDGET SAFETY & 9.5 GB HARD STOP:');
  const quota = getR2QuotaStatus();
  assert(quota.storageHardLimitGB === 9.5, 'Hard stop is configured at strictly 9.5 GB (not raised to 9.7 or 9.8 GB)');
  assert(quota.classAHaltLimit === 900000, 'Class A operations capped at 900,000 (90% of 1M)');
  assert(quota.classBHaltLimit === 9000000, 'Class B operations capped at 9,000,000 (90% of 10M)');
  assert(Boolean(quota.disclaimer.includes('propagation delays')), 'Warning disclaimer clearly explains application-side telemetry limitations');

  // Test that no upload can bypass the 9.5 GB limit
  const hugeBytes = 10 * 1024 * 1024 * 1024; // 10 GB
  const checkHuge = checkUploadAllowed(hugeBytes);
  assert(checkHuge.allowed === false, 'Huge upload is blocked before initiating write');
  assert(checkHuge.status === 'blocked_storage', 'Status correctly transitions to blocked_storage');

  // Atomic reservation and abort cleanup
  clearActiveReservations();
  const res1 = reserveUploadCapacity(500 * 1024 * 1024);
  assert(res1.allowed === true && Boolean(res1.reservationId), 'Atomic reservation slot granted');
  releaseUploadCapacity(res1.reservationId!);
  const afterRelease = getR2QuotaStatus();
  assert(afterRelease.activeReservationsCount === 0, 'Reservation released upon cancellation/abort');

  // Test fail-closed behavior on storage pause
  // Simulate reaching hard-stop
  syncStorageFromMediaRecords(STORAGE_PAUSE_HARD_LIMIT_BYTES + 1024);
  const pausedCheck = checkUploadAllowed(1024);
  assert(pausedCheck.allowed === false, 'Uploads strictly blocked when storage reaches 9.5 GB hard stop');
  assert(Boolean(pausedCheck.reason?.includes('safety limit reached')), 'Storage pause reason clearly explains zero-budget protection');

  // CRITICAL REQUIREMENT: Text messaging STILL WORKS when media storage is paused!
  const textMsgDuringPause = sendDirectMessage({
    senderId: aliceReg.user!.id,
    recipientId: bobReg.user!.id,
    text: 'Hello Bob! The cloud media storage is currently paused, but text messaging remains fully functional!',
  });
  assert(Boolean(textMsgDuringPause.id), 'CRITICAL: Text message succeeds even when media upload is paused at hard stop');

  // Restore normal quota state
  syncStorageFromMediaRecords(2048);

  // -------------------------------------------------------------------------
  // 5. LOCAL DISK QUOTA & FALLBACK SAFETY
  // -------------------------------------------------------------------------
  console.log('\n5. LOCAL FALLBACK DISK QUOTA CEILING:');
  const diskCheck = checkLocalDiskAllowed(1024);
  assert(diskCheck.allowed === true, 'Local disk allows normal uploads within quota');
  const diskExceeded = checkLocalDiskAllowed(3 * 1024 * 1024 * 1024); // Exceeds 2.0 GB
  assert(diskExceeded.allowed === false, 'Local disk fallback strictly blocks uploads exceeding 2.0 GB ceiling (prevents disk exhaustion)');

  // -------------------------------------------------------------------------
  // 6. MONETIZATION, 70/30 SHARE & WITHDRAWAL AUDIT
  // -------------------------------------------------------------------------
  console.log('\n6. MONETIZATION LEDGER & 70/30 SPLIT AUDIT:');
  // Credit coins via rewarded ad SSV
  const claimRes = verifyAndClaimRewardedAd({
    userId: aliceReg.user!.id,
    clientTransactionId: `tx_audit_${ts}`,
    adUnitId: 'ca-app-pub-3940256099942544/5224354917',
    durationWatchedSeconds: 15,
  });
  assert(claimRes.success === true, 'Rewarded ad verified via server-side SSV');
  assert(claimRes.entry?.coinsAmount === 50, 'Creator awarded 50 Creator Coins');
  assert(claimRes.entry?.creatorAmountCents === 35, 'Creator strictly receives 70% share (35 cents from 50 cents gross)');

  // Test withdrawal request
  // Credit verifiable ledger earnings for Alice so availableBalanceCents >= 10000
  recordLedgerEarning(aliceReg.user!.id, 20000, 'Test creator earnings for withdrawal test');

  const withdrawReq = requestCreatorWithdrawal({
    userId: aliceReg.user!.id,
    amountCents: 10000,
    payoutProvider: 'bkash',
    accountDetails: {
      accountIdentifierMasked: '01712-345678',
      accountHolderName: 'Alice Engineer',
    },
  });
  assert(withdrawReq.success && Boolean(withdrawReq.withdrawal), 'bKash withdrawal request submitted');
  assert(withdrawReq.withdrawal?.status === 'pending', 'Withdrawal request starts in pending status');

  // Admin approves withdrawal
  const ownerUser = registerUser({
    username: `owner_audit_${ts}`,
    email: `owner_${ts}@example.com`,
    displayName: 'ZanGi Owner',
    password: 'OwnerPassword123!',
    ip: '127.0.0.1',
  });
  const ownerRecord = findUserById(ownerUser.user!.id);
  if (ownerRecord) ownerRecord.role = 'owner';

  const approved = updateWithdrawalStatusAdmin(
    ownerUser.user!.id,
    withdrawReq.withdrawal!.id,
    'approved',
    'Verified by finance admin'
  );
  assert(approved.success && approved.withdrawal?.status === 'approved', 'Admin successfully approved withdrawal');

  const paidOut = updateWithdrawalStatusAdmin(
    ownerUser.user!.id,
    withdrawReq.withdrawal!.id,
    'paid',
    'Disbursed through bKash merchant gateway',
    undefined,
    'BKASH_TRX_9928172'
  );
  assert(paidOut.success && paidOut.withdrawal?.status === 'paid', 'Withdrawal marked paid with verifiable transaction reference');
  assert(paidOut.withdrawal?.transactionReference === 'BKASH_TRX_9928172', 'Audit trail maintains authentic transaction reference');

  // -------------------------------------------------------------------------
  // 7. DISK PERSISTENCE & RESTART DURABILITY
  // -------------------------------------------------------------------------
  console.log('\n7. DISK PERSISTENCE & DATA INTEGRITY:');
  assert(fs.existsSync(path.resolve(process.cwd(), 'data', 'users_db.json')), 'users_db.json exists on disk');
  assert(fs.existsSync(path.resolve(process.cwd(), 'data', 'social_db.json')), 'social_db.json exists on disk');
  assert(fs.existsSync(path.resolve(process.cwd(), 'data', 'ledger_db.json')), 'ledger_db.json exists on disk');
  assert(fs.existsSync(path.resolve(process.cwd(), 'data', 'r2_usage_tracker.json')), 'r2_usage_tracker.json exists on disk');

  console.log('\n================================================================');
  console.log(`  AUDIT SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAudit().catch((err) => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
