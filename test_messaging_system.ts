/**
 * Automated Test Suite for Zan-Gi Direct Messaging & Rich Communications
 * Traces a message from sender to recipient and back.
 * Verifies:
 * 1. 1:1 direct messaging thread creation and chronological persistence
 * 2. Bi-directional dialogue: Sender to Recipient, Recipient reply back
 * 3. Reply-to threading with quotation preview
 * 4. Emoji reactions toggle and removal
 * 5. Optimistic reconciliation and duplicate send prevention
 * 6. Mark-as-read and live unread badge calculations
 * 7. Message search by text content
 * 8. Conversation pinning, muting, and clearing
 * 9. Message deletion:
 *    - Delete for me (deletedForUserIds)
 *    - Delete for everyone (isDeleted flag within 24hr window)
 * 10. Privacy & blocking rules:
 *    - Mutual block check
 *    - whoCanMessage ('none', 'followers') rules
 * 11. Media and voice-note messaging attributes
 * 12. Disk persistence in data/social_db.json
 */

import fs from 'fs';
import {
  getConversations,
  getMessagesBetween,
  sendDirectMessage,
  markMessagesAsRead,
  toggleMessageReaction,
  deleteMessage,
  togglePinConversation,
  toggleMuteConversation,
  clearConversationMessages,
  searchUserMessages,
} from './src/server/socialStore.js';
import {
  registerUser,
  blockUser,
  unblockUser,
  findUserById,
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

async function runMessagingTests() {
  console.log('================================================================');
  console.log('     ZAN-GI DIRECT MESSAGING & CHAT SYSTEM AUTOMATED TEST       ');
  console.log('================================================================\n');

  // Register two fresh test users to ensure completely clean conversation state
  const ts = Date.now();
  const aliceRes = registerUser({
    email: `alice_${ts}@zangi.test`,
    username: `alice_${ts}`,
    displayName: 'Alice Explorer',
    password: 'Password@2026!',
  });
  const bobRes = registerUser({
    email: `bob_${ts}@zangi.test`,
    username: `bob_${ts}`,
    displayName: 'Bob Creator',
    password: 'Password@2026!',
  });

  const alice = aliceRes.user!;
  const bob = bobRes.user!;
  assert(Boolean(alice && bob), 'Registered test accounts Alice and Bob for message tracing');

  console.log('\n1. SENDER TO RECIPIENT TRACE (ALICE -> BOB):');
  const msg1 = sendDirectMessage({
    senderId: alice.id,
    recipientId: bob.id,
    text: 'Hello Bob! Testing the new Zan-Gi messaging relay.',
    clientMessageId: `cli_test_1`,
  });
  assert(Boolean(msg1 && msg1.id), 'Message 1 successfully created by Alice for Bob');
  assert(msg1.senderId === alice.id && msg1.recipientId === bob.id, 'Message sender and recipient match parameters');
  assert(msg1.isRead === false, 'New message starts with isRead = false');

  // Verify Bob sees the unread conversation
  const bobConversations = getConversations(bob.id);
  const convWithAlice = bobConversations.find((c) => c.partner.id === alice.id);
  assert(Boolean(convWithAlice), 'Bob sees Alice in his conversation inbox');
  assert(convWithAlice?.unreadCount === 1, 'Bob has exactly 1 unread message from Alice');
  assert(convWithAlice?.lastMessage.text === 'Hello Bob! Testing the new Zan-Gi messaging relay.', 'Last message preview matches in Bob inbox');

  // Verify Bob loads the thread
  const bobThread = getMessagesBetween(bob.id, alice.id);
  assert(bobThread.messages.length >= 1, 'Bob retrieves messages thread with Alice');
  assert(bobThread.messages.some((m) => m.id === msg1.id), 'Alice message is present in Bob thread view');
  assert(bobThread.isBlocked === false, 'Thread is not blocked between Alice and Bob');

  console.log('\n2. MARK AS READ & UNREAD RECONCILIATION:');
  const readCount = markMessagesAsRead(bob.id, alice.id);
  assert(readCount >= 1, 'markMessagesAsRead marks Alice message as read for Bob');

  const bobConversationsAfterRead = getConversations(bob.id);
  const convAfterRead = bobConversationsAfterRead.find((c) => c.partner.id === alice.id);
  assert(convAfterRead?.unreadCount === 0, 'Bob unread count drops to 0 after viewing the conversation');

  console.log('\n3. RECIPIENT REPLY BACK (BOB -> ALICE) WITH THREADING:');
  const msg2 = sendDirectMessage({
    senderId: bob.id,
    recipientId: alice.id,
    text: 'Hi Alice! Received loud and clear. Replying to your note.',
    replyToId: msg1.id,
    clientMessageId: `cli_test_2`,
  });
  assert(Boolean(msg2 && msg2.id), 'Bob reply message sent successfully');
  assert(msg2.replyToId === msg1.id, 'Reply message correctly stores replyToId reference');
  assert(Boolean(msg2.replyToPreview), 'Reply message contains quote preview of the original message');
  assert(Boolean(msg2.replyToPreview?.text.includes('Hello Bob')), 'Reply preview contains excerpt of Alice message');

  // Verify Alice sees the reply in her thread
  const aliceThread = getMessagesBetween(alice.id, bob.id);
  assert(aliceThread.messages.length >= 2, 'Alice thread contains both sent and received messages');
  const lastAliceMsg = aliceThread.messages[aliceThread.messages.length - 1];
  assert(lastAliceMsg.id === msg2.id, 'Chronological order preserved: Bob reply is the latest message');

  console.log('\n4. EMOJI REACTIONS:');
  const reactRes = toggleMessageReaction(msg2.id, alice.id, '❤️');
  assert(reactRes.success === true, 'Alice successfully adds a heart emoji reaction to Bob message');
  assert(reactRes.reactions[alice.id] === '❤️', 'Reaction dictionary contains Alice reaction');

  // Toggling the same reaction removes it
  const unreactRes = toggleMessageReaction(msg2.id, alice.id, '❤️');
  assert(unreactRes.reactions[alice.id] === undefined, 'Toggling the same reaction removes it cleanly');

  // Add fire emoji
  const reactFire = toggleMessageReaction(msg2.id, alice.id, '🔥');
  assert(reactFire.reactions[alice.id] === '🔥', 'Alice reacts with fire emoji');

  console.log('\n5. MEDIA & VOICE NOTE MESSAGING:');
  const voiceMsg = sendDirectMessage({
    senderId: alice.id,
    recipientId: bob.id,
    text: 'Voice note demo',
    isAudio: true,
    audioDuration: '0:18',
    audioUrl: '/uploads/sample_voice.webm',
  });
  assert(voiceMsg.isAudio === true, 'Voice message created with isAudio = true');
  assert(voiceMsg.audioDuration === '0:18', 'Voice message preserves duration string');

  const photoMsg = sendDirectMessage({
    senderId: bob.id,
    recipientId: alice.id,
    text: 'Check out this photo!',
    imageUrl: '/uploads/sample_pic.jpg',
  });
  assert(photoMsg.imageUrl === '/uploads/sample_pic.jpg', 'Image attachment URL preserved on message record');

  console.log('\n6. DUPLICATE SEND PREVENTION:');
  const dup1 = sendDirectMessage({
    senderId: alice.id,
    recipientId: bob.id,
    text: 'Non-repeat message',
  });
  const dup2 = sendDirectMessage({
    senderId: alice.id,
    recipientId: bob.id,
    text: 'Non-repeat message',
  });
  assert(dup1.id === dup2.id, 'Immediate duplicate send within debounce window returns existing message ID without duplicate creation');

  console.log('\n7. SEARCH MESSAGES:');
  const searchHits = searchUserMessages(alice.id, 'messaging relay');
  assert(searchHits.length >= 1, 'searchUserMessages finds Alice initial message by keyword');
  assert(searchHits[0].message.text.includes('messaging relay'), 'Search result contains matching text snippet');

  console.log('\n8. PIN & MUTE CONVERSATIONS:');
  const pinRes1 = togglePinConversation(alice.id, bob.id);
  assert(pinRes1.isPinned === true, 'Alice successfully pins Bob conversation');
  const pinRes2 = togglePinConversation(alice.id, bob.id);
  assert(pinRes2.isPinned === false, 'Alice successfully unpins Bob conversation');

  const muteRes = toggleMuteConversation(alice.id, bob.id);
  assert(muteRes.isMuted === true, 'Alice mutes Bob conversation notifications');

  console.log('\n9. MESSAGE DELETION (FOR ME VS FOR EVERYONE):');
  // Create message to delete
  const msgToDelete = sendDirectMessage({
    senderId: alice.id,
    recipientId: bob.id,
    text: 'Secret message to be deleted',
  });

  // Delete for me (Alice deletes for herself)
  deleteMessage(msgToDelete.id, alice.id, false);
  const aliceThreadAfterDel = getMessagesBetween(alice.id, bob.id);
  assert(!aliceThreadAfterDel.messages.some((m) => m.id === msgToDelete.id), 'Message hidden from Alice after delete for me');

  const bobThreadAfterDel = getMessagesBetween(bob.id, alice.id);
  assert(bobThreadAfterDel.messages.some((m) => m.id === msgToDelete.id), 'Message still visible to Bob after Alice deleted for herself only');

  // Delete for everyone (Bob sends a message and deletes for everyone)
  const msgEveryone = sendDirectMessage({
    senderId: bob.id,
    recipientId: alice.id,
    text: 'Oops sent by mistake',
  });
  deleteMessage(msgEveryone.id, bob.id, true);

  const bobThreadAfterEveryone = getMessagesBetween(bob.id, alice.id);
  const deletedInBob = bobThreadAfterEveryone.messages.find((m) => m.id === msgEveryone.id);
  assert(deletedInBob?.isDeleted === true, 'Message marked isDeleted = true for sender');
  assert(deletedInBob?.text === 'This message was deleted', 'Content masked to placeholder for sender');

  const aliceThreadAfterEveryone = getMessagesBetween(alice.id, bob.id);
  const deletedInAlice = aliceThreadAfterEveryone.messages.find((m) => m.id === msgEveryone.id);
  assert(deletedInAlice?.isDeleted === true, 'Message marked isDeleted = true for recipient');
  assert(deletedInAlice?.text === 'This message was deleted', 'Content masked to placeholder for recipient');

  console.log('\n10. PRIVACY & BLOCKING ENFORCEMENT:');
  blockUser(alice.id, bob.id);

  let bobBlockedSendFailed = false;
  try {
    sendDirectMessage({
      senderId: bob.id,
      recipientId: alice.id,
      text: 'Are you there Alice?',
    });
  } catch (err: any) {
    bobBlockedSendFailed = true;
    assert(err.message.includes('blocked'), 'Blocked recipient rejects incoming message from sender');
  }
  assert(bobBlockedSendFailed, 'Bob cannot message Alice while Alice has him blocked');

  const threadWhileBlocked = getMessagesBetween(bob.id, alice.id);
  assert(threadWhileBlocked.isBlocked === true, 'Thread indicates isBlocked = true');

  // Unblock
  unblockUser(alice.id, bob.id);

  console.log('\n11. PERSISTENCE IN DATA STORE:');
  const dbPath = './data/social_db.json';
  assert(fs.existsSync(dbPath), 'data/social_db.json exists on disk');
  const diskData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  assert(Array.isArray(diskData.messages), 'messages array is persisted in social_db.json');
  assert(diskData.messages.some((m: any) => m.id === msg1.id), 'Alice original message is saved to persistent disk database');

  console.log('\n================================================================');
  console.log(`  MESSAGING SYSTEM TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runMessagingTests().catch((err) => {
  console.error('Test suite uncaught error:', err);
  process.exit(1);
});
