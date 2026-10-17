import dotenv from 'dotenv';
dotenv.config();
import crypto from 'crypto';
import path from 'path';
import { atomicWriteJson, safeReadJson } from './database.js';

export interface DbUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bannerUrl?: string;
  bio: string;
  passwordHash: string;
  passwordSalt: string;
  isVerified: boolean;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: number;
  role: 'owner' | 'admin' | 'creator' | 'user';
  followersCount: number;
  followingCount: number;
  creatorCoins: number;
  languagePreference: 'bn' | 'en';
  createdAt: string;
  isDeactivated: boolean;
  isBanned?: boolean;
  isPrivate?: boolean;
  whoCanComment?: 'everyone' | 'followers' | 'none';
  whoCanMessage?: 'everyone' | 'followers' | 'none';
  blockedUserIds?: string[];
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  twoFactorRecoveryCodes?: string[];
  isPremium?: boolean;
  premiumTier?: 'basic' | 'pro' | 'creator_plus';
  premiumExpiresAt?: string;
  notificationPreferences?: {
    likes: boolean;
    comments: boolean;
    follows: boolean;
    messages: boolean;
    systemUpdates: boolean;
    creatorEarn: boolean;
  };
  mediaPreferences?: {
    dataSaver: boolean;
    autoplay: boolean;
    mediaQuality: 'high' | 'standard' | 'data_saver';
  };
  storagePreferences?: {
    saveMediaToDevice?: boolean;
    autoDownload?: boolean;
    autoDownloadPhotos?: 'never' | 'wifi_only' | 'always';
    autoDownloadVideos?: 'never' | 'wifi_only' | 'always';
    autoDownloadVoiceNotes?: 'never' | 'wifi_only' | 'always';
    wifiOnly?: boolean;
    saveToGallery?: boolean;
    cloudDelivery?: boolean;
    localOnlyMedia?: boolean;
  };
  profileVisitsCount?: number;
}

export interface DbSession {
  token: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
  ip: string;
  userAgent: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  timestamp: string;
  details: Record<string, any>;
  ip: string;
}

// File persistence paths
const USERS_DB_FILE = path.resolve(process.cwd(), 'data', 'users_db.json');
const SESSIONS_DB_FILE = path.resolve(process.cwd(), 'data', 'sessions_db.json');
const AUDIT_LOGS_FILE = path.resolve(process.cwd(), 'data', 'audit_logs.json');

// In-Memory Stores backed by atomic disk files
const users: Map<string, DbUser> = new Map();
const sessions: Map<string, DbSession> = new Map();
const auditLogs: AuditLog[] = [];

// Helper: Hash password with PBKDF2 (100,000 iterations, 64 bytes, sha512)
export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function persistUsers(): void {
  try {
    const list = Array.from(users.values());
    atomicWriteJson(USERS_DB_FILE, list);
  } catch (e) {
    console.error('[AuthService] Failed to persist users:', e);
  }
}

function persistSessions(): void {
  try {
    const list = Array.from(sessions.values());
    atomicWriteJson(SESSIONS_DB_FILE, list);
  } catch (e) {
    console.error('[AuthService] Failed to persist sessions:', e);
  }
}

function persistAuditLogs(): void {
  try {
    atomicWriteJson(AUDIT_LOGS_FILE, auditLogs.slice(0, 500));
  } catch (e) {
    console.error('[AuthService] Failed to persist audit logs:', e);
  }
}

export function addAuditLog(userId: string, action: string, details: Record<string, any>, ip: string = '127.0.0.1') {
  auditLogs.unshift({
    id: `log_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    userId,
    action,
    timestamp: new Date().toISOString(),
    details,
    ip,
  });
  if (auditLogs.length > 500) {
    auditLogs.pop();
  }
  persistAuditLogs();
}

export function getAuditLogs(): AuditLog[] {
  return auditLogs;
}

// Seed default platform accounts for fresh installs
function initSeedAccounts() {
  // Fresh installations DO NOT hardcode an owner account with default password.
  // Instead, the first Owner must be securely created via the first-owner bootstrap API
  // using OWNER_BOOTSTRAP_SECRET and a strong, non-default password.

  // 2. Verified Creator (Fahim Ahmed)
  const creatorSalt = generateSalt();
  const creatorUser: DbUser = {
    id: 'user_fahim',
    email: 'fahim@zangi.app',
    username: 'fahim_ai',
    displayName: 'Fahim Ahmed',
    avatarUrl: '/src/assets/images/zangi_creator_tech_1791614790487.jpg',
    bio: 'Building the future of AI & Social in Bangladesh. Connect. Create. Imagine. Earn. 🇧🇩',
    passwordSalt: creatorSalt,
    passwordHash: hashPassword('Fahim@2026!', creatorSalt),
    isVerified: true,
    isEmailVerified: true,
    role: 'creator',
    followersCount: 14820,
    followingCount: 328,
    creatorCoins: 1420,
    languagePreference: 'bn',
    createdAt: new Date('2026-01-15').toISOString(),
    isDeactivated: false,
    isPrivate: false,
    whoCanComment: 'everyone',
    whoCanMessage: 'everyone',
    blockedUserIds: [],
    notificationPreferences: {
      likes: true,
      comments: true,
      follows: true,
      messages: true,
      systemUpdates: true,
      creatorEarn: true,
    },
    mediaPreferences: {
      dataSaver: false,
      autoplay: true,
      mediaQuality: 'standard',
    },
  };
  users.set(creatorUser.id, creatorUser);

  // 3. Visuals Creator (Nusrat Jahan)
  const nusratSalt = generateSalt();
  const nusratUser: DbUser = {
    id: 'user_nusrat',
    email: 'nusrat@zangi.app',
    username: 'nusrat_visuals',
    displayName: 'Nusrat Jahan',
    avatarUrl: '/src/assets/images/zangi_creator_art_1791614801925.jpg',
    bio: 'Digital artist & 3D animator | Blending heritage aesthetics with generative tools in Zan-Gi Studio',
    passwordSalt: nusratSalt,
    passwordHash: hashPassword('Nusrat@2026!', nusratSalt),
    isVerified: true,
    isEmailVerified: true,
    role: 'creator',
    followersCount: 28400,
    followingCount: 142,
    creatorCoins: 3850,
    languagePreference: 'bn',
    createdAt: new Date('2026-02-01').toISOString(),
    isDeactivated: false,
    isPrivate: false,
    whoCanComment: 'everyone',
    whoCanMessage: 'everyone',
    blockedUserIds: [],
    notificationPreferences: {
      likes: true,
      comments: true,
      follows: true,
      messages: true,
      systemUpdates: true,
      creatorEarn: true,
    },
    mediaPreferences: {
      dataSaver: false,
      autoplay: true,
      mediaQuality: 'standard',
    },
  };
  users.set(nusratUser.id, nusratUser);

  persistUsers();
}

function loadDatabase(): void {
  // Load users
  const storedUsers = safeReadJson<DbUser[]>(USERS_DB_FILE, []);
  if (storedUsers && storedUsers.length > 0) {
    for (const u of storedUsers) {
      users.set(u.id, u);
    }
  } else {
    initSeedAccounts();
  }

  // Load sessions
  const storedSessions = safeReadJson<DbSession[]>(SESSIONS_DB_FILE, []);
  const now = Date.now();
  if (storedSessions && storedSessions.length > 0) {
    for (const s of storedSessions) {
      if (s.expiresAt > now) {
        sessions.set(s.token, s);
      }
    }
  }

  // Load audit logs
  const storedLogs = safeReadJson<AuditLog[]>(AUDIT_LOGS_FILE, []);
  if (storedLogs && storedLogs.length > 0) {
    auditLogs.push(...storedLogs);
  }
}

// Initialize persistence store
loadDatabase();

// Strip password secrets and 2FA internal keys before returning user to client
export function sanitizeUser(user: DbUser) {
  const {
    passwordHash,
    passwordSalt,
    emailVerificationToken,
    passwordResetToken,
    passwordResetExpires,
    twoFactorSecret,
    twoFactorRecoveryCodes,
    ...safe
  } = user;
  return safe;
}

export function findUserByEmail(email: string): DbUser | undefined {
  const norm = email.toLowerCase().trim();
  for (const user of users.values()) {
    if (user.email.toLowerCase() === norm) return user;
  }
  return undefined;
}

export function findUserByUsername(username: string): DbUser | undefined {
  const norm = username.toLowerCase().trim();
  for (const user of users.values()) {
    if (user.username.toLowerCase() === norm) return user;
  }
  return undefined;
}

export function findUserById(id: string): DbUser | undefined {
  return users.get(id);
}

export function getAllActiveUsers(): DbUser[] {
  return Array.from(users.values()).filter((u) => !u.isDeactivated && !u.isBanned);
}

// ----------------------------------------------------
// RFC 6238 TOTP Two-Factor Authentication Engine
// ----------------------------------------------------
function base32ToBuffer(base32: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = base32.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = alphabet.indexOf(clean[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateTotpCode(secret: string, timeStepOffset: number = 0, stepSeconds: number = 30): string {
  try {
    const secretBuffer = base32ToBuffer(secret);
    const timeStep = Math.floor(Date.now() / 1000 / stepSeconds) + timeStepOffset;

    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeBigInt64BE(BigInt(timeStep));

    const hmac = crypto.createHmac('sha1', secretBuffer);
    hmac.update(timeBuffer);
    const hash = hmac.digest();

    const offset = hash[hash.length - 1] & 0x0f;
    const binary =
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);

    const otp = (binary % 1000000).toString().padStart(6, '0');
    return otp;
  } catch (e) {
    console.warn('[2FA] Error computing TOTP code:', e);
    return '000000';
  }
}

export function verifyTotpCode(secret: string, code: string, window: number = 1): boolean {
  const cleanCode = code.trim().replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleanCode)) return false;

  for (let offset = -window; offset <= window; offset++) {
    if (generateTotpCode(secret, offset) === cleanCode) {
      return true;
    }
  }
  return false;
}

// ----------------------------------------------------
// Authentication Actions
// ----------------------------------------------------
export function registerUser(params: {
  email: string;
  username: string;
  displayName: string;
  password: string;
  ip?: string;
}): { user?: DbUser; error?: string } {
  const { email, username, displayName, password, ip = '127.0.0.1' } = params;

  if (!email || !username || !displayName || !password) {
    return { error: 'All fields are required.' };
  }
  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters.' };
  }
  if (findUserByEmail(email)) {
    return { error: 'An account with this email address already exists.' };
  }
  if (findUserByUsername(username)) {
    return { error: 'This username is already taken. Please pick another.' };
  }

  const salt = generateSalt();
  const passwordHash = hashPassword(password, salt);
  const verifyCode = generateVerificationCode();

  const newUser: DbUser = {
    id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    email: email.toLowerCase().trim(),
    username: username.toLowerCase().trim(),
    displayName: displayName.trim(),
    avatarUrl: '/src/assets/images/zangi_creator_tech_1791614790487.jpg',
    bio: 'Zan-Gi Community Member. Connect. Create. Imagine. Earn.',
    passwordSalt: salt,
    passwordHash,
    isVerified: false,
    isEmailVerified: false,
    emailVerificationToken: verifyCode,
    role: 'user',
    followersCount: 0,
    followingCount: 0,
    creatorCoins: 100, // Welcome bonus
    languagePreference: 'bn',
    createdAt: new Date().toISOString(),
    isDeactivated: false,
    isPrivate: false,
    whoCanComment: 'everyone',
    whoCanMessage: 'everyone',
    blockedUserIds: [],
    notificationPreferences: {
      likes: true,
      comments: true,
      follows: true,
      messages: true,
      systemUpdates: true,
      creatorEarn: true,
    },
    mediaPreferences: {
      dataSaver: false,
      autoplay: true,
      mediaQuality: 'standard',
    },
  };

  users.set(newUser.id, newUser);
  persistUsers();
  addAuditLog(newUser.id, 'USER_REGISTERED', { email: newUser.email, username: newUser.username }, ip);

  return { user: newUser };
}

export function loginUser(
  emailOrUsername: string,
  password?: string,
  ip: string = '127.0.0.1',
  userAgent: string = 'browser',
  twoFactorCode?: string
): { user?: DbUser; session?: DbSession; requires2FA?: boolean; error?: string } {
  const norm = emailOrUsername.toLowerCase().trim();
  let user: DbUser | undefined;

  for (const u of users.values()) {
    if (u.email.toLowerCase() === norm || u.username.toLowerCase() === norm) {
      user = u;
      break;
    }
  }

  if (!user) {
    return { error: 'Invalid email/username or password.' };
  }

  if (user.isBanned) {
    return { error: 'This account has been suspended by platform administration.' };
  }

  if (!password || !password.trim()) {
    return { error: 'Password is required.' };
  }

  const testHash = hashPassword(password, user.passwordSalt);
  if (testHash !== user.passwordHash) {
    addAuditLog(user.id, 'LOGIN_FAILED', { reason: 'bad_password' }, ip);
    return { error: 'Invalid email/username or password.' };
  }

  // Check 2FA Enforcement
  if (user.twoFactorEnabled && user.twoFactorSecret) {
    if (!twoFactorCode) {
      return {
        requires2FA: true,
        error: 'Two-factor authentication code required.',
      };
    }

    const clean2FA = twoFactorCode.trim().replace(/\s+/g, '');
    let is2FAValid = false;

    // Check TOTP algorithm
    if (verifyTotpCode(user.twoFactorSecret, clean2FA)) {
      is2FAValid = true;
    }

    // Check Backup Recovery Codes
    if (!is2FAValid && user.twoFactorRecoveryCodes) {
      const recIdx = user.twoFactorRecoveryCodes.indexOf(clean2FA.toUpperCase());
      if (recIdx > -1) {
        is2FAValid = true;
        // Consume recovery code
        user.twoFactorRecoveryCodes.splice(recIdx, 1);
        persistUsers();
        addAuditLog(user.id, '2FA_RECOVERY_CODE_CONSUMED', { remaining: user.twoFactorRecoveryCodes.length }, ip);
      }
    }

    if (!is2FAValid) {
      addAuditLog(user.id, '2FA_VERIFICATION_FAILED', {}, ip);
      return {
        requires2FA: true,
        error: 'Invalid 2FA code or recovery code. Please try again.',
      };
    }
  }

  if (user.isDeactivated) {
    // Reactivate upon successful login
    user.isDeactivated = false;
    persistUsers();
    addAuditLog(user.id, 'ACCOUNT_REACTIVATED', {}, ip);
  }

  // Create rolling 30-day session
  const token = generateToken();
  const session: DbSession = {
    token,
    userId: user.id,
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    ip,
    userAgent,
  };

  sessions.set(token, session);
  persistSessions();
  addAuditLog(user.id, 'LOGIN_SUCCESS', { userAgent }, ip);

  return { user, session };
}

// ----------------------------------------------------
// Secure First-Owner Bootstrap & Recovery System
// ----------------------------------------------------

// Helper: Check if an Owner account already exists in the system
export function hasExistingOwner(): boolean {
  for (const u of users.values()) {
    if (u.role === 'owner') return true;
  }
  return false;
}

// Helper: Read bootstrap secret from environment variables only (never logged or sent to client)
export function getBootstrapSecret(): string | null {
  const secret = (process.env.OWNER_BOOTSTRAP_SECRET || process.env.OWNER_SETUP_SECRET || '').trim();
  return secret.length > 0 ? secret : null;
}

// Timing-safe constant-time secret comparison to prevent timing side-channel attacks
function verifySecretConstantTime(provided: string, expected: string): boolean {
  if (!provided || !expected) return false;
  const bufA = Buffer.from(provided);
  const bufB = Buffer.from(expected);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Strong password policy enforcement for Owner accounts
export function validateStrongPassword(password: string): { valid: boolean; reason?: string } {
  if (!password || password.length < 8) {
    return { valid: false, reason: 'Password must be at least 8 characters long.' };
  }
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigitOrSpecial = /[\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  if (!hasUpper || !hasLower || !hasDigitOrSpecial) {
    return {
      valid: false,
      reason: 'Password must include uppercase, lowercase, and at least one number or special character.'
    };
  }
  return { valid: true };
}

// First-owner one-time bootstrap
export function bootstrapFirstOwner(params: {
  secret: string;
  email: string;
  username: string;
  displayName: string;
  password?: string;
  promoteExistingUserId?: string;
  ip?: string;
  userAgent?: string;
}): { success: boolean; user?: DbUser; session?: DbSession; error?: string; status?: number } {
  const {
    secret,
    email,
    username,
    displayName,
    password,
    promoteExistingUserId,
    ip = '127.0.0.1',
    userAgent = 'Owner-Bootstrap'
  } = params;

  // 1. Verify bootstrap secret is configured in environment
  const serverSecret = getBootstrapSecret();
  if (!serverSecret) {
    return {
      success: false,
      error: 'First-owner setup secret is not configured on the server. Please set OWNER_BOOTSTRAP_SECRET in your server environment.',
      status: 503,
    };
  }

  // 2. Enforce permanent bootstrap disabling if an Owner already exists
  if (hasExistingOwner()) {
    addAuditLog('system', 'OWNER_BOOTSTRAP_BLOCKED_ALREADY_EXISTS', { ipSnippet: ip.substring(0, 7) + '...' }, ip);
    return {
      success: false,
      error: 'Bootstrap permanently disabled: An Owner account is already established on this platform. Use the audited recovery process if credential reset is required.',
      status: 403,
    };
  }

  // 3. Timing-safe comparison of provided secret
  if (!verifySecretConstantTime(secret, serverSecret)) {
    addAuditLog('system', 'OWNER_BOOTSTRAP_SECRET_MISMATCH', { ipSnippet: ip.substring(0, 7) + '...' }, ip);
    return {
      success: false,
      error: 'Invalid owner setup secret. Please verify the server secret and try again.',
      status: 401,
    };
  }

  // 4. Safe promotion path if database already contains users
  if (promoteExistingUserId) {
    const targetUser = users.get(promoteExistingUserId);
    if (!targetUser) {
      return { success: false, error: 'Target user for promotion was not found.', status: 404 };
    }
    targetUser.role = 'owner';
    targetUser.isVerified = true;
    targetUser.isEmailVerified = true;
    persistUsers();

    addAuditLog(targetUser.id, 'USER_PROMOTED_TO_OWNER_VIA_SETUP_SECRET', { username: targetUser.username }, ip);

    const token = generateToken();
    const session: DbSession = {
      token,
      userId: targetUser.id,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      ip,
      userAgent,
    };
    sessions.set(token, session);
    persistSessions();

    return { success: true, user: targetUser, session };
  }

  // 5. Creating a brand new Owner account
  if (!email || !username || !displayName || !password) {
    return { success: false, error: 'Email, username, display name, and password are required.', status: 400 };
  }

  const passCheck = validateStrongPassword(password);
  if (!passCheck.valid) {
    return { success: false, error: passCheck.reason, status: 400 };
  }

  if (findUserByEmail(email)) {
    return { success: false, error: 'An account with this email address already exists.', status: 409 };
  }
  if (findUserByUsername(username)) {
    return { success: false, error: 'This username is already taken. Please choose another.', status: 409 };
  }

  const salt = generateSalt();
  const passwordHash = hashPassword(password, salt);

  const ownerUser: DbUser = {
    id: `user_owner_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    email: email.toLowerCase().trim(),
    username: username.toLowerCase().trim(),
    displayName: displayName.trim(),
    avatarUrl: '/src/assets/images/zangi_creator_tech_1791614790487.jpg',
    bio: 'Platform Owner & Administrator for Zan-Gi AI Social Universe. 🛡️',
    passwordSalt: salt,
    passwordHash,
    isVerified: true,
    isEmailVerified: true,
    role: 'owner',
    followersCount: 0,
    followingCount: 0,
    creatorCoins: 10000,
    languagePreference: 'bn',
    createdAt: new Date().toISOString(),
    isDeactivated: false,
    isPrivate: false,
    whoCanComment: 'everyone',
    whoCanMessage: 'everyone',
    blockedUserIds: [],
    notificationPreferences: {
      likes: true,
      comments: true,
      follows: true,
      messages: true,
      systemUpdates: true,
      creatorEarn: true,
    },
    mediaPreferences: {
      dataSaver: false,
      autoplay: true,
      mediaQuality: 'high',
    },
  };

  users.set(ownerUser.id, ownerUser);
  persistUsers();

  const token = generateToken();
  const session: DbSession = {
    token,
    userId: ownerUser.id,
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    ip,
    userAgent,
  };
  sessions.set(token, session);
  persistSessions();

  addAuditLog(ownerUser.id, 'FIRST_OWNER_BOOTSTRAP_COMPLETED', { username: ownerUser.username, email: ownerUser.email }, ip);

  return { success: true, user: ownerUser, session };
}

// Audited Owner Credential Recovery / Rotation using Server Recovery Secret
export function recoverOwnerCredentials(params: {
  recoverySecret: string;
  emailOrUsername: string;
  newPassword: string;
  ip?: string;
}): { success: boolean; error?: string; status?: number } {
  const { recoverySecret, emailOrUsername, newPassword, ip = '127.0.0.1' } = params;

  const serverSecret = (process.env.OWNER_RECOVERY_SECRET || process.env.OWNER_BOOTSTRAP_SECRET || '').trim();
  if (!serverSecret) {
    return { success: false, error: 'Owner recovery secret is not configured on the server.', status: 503 };
  }

  if (!verifySecretConstantTime(recoverySecret, serverSecret)) {
    addAuditLog('system', 'OWNER_RECOVERY_SECRET_MISMATCH', { ipSnippet: ip.substring(0, 7) + '...' }, ip);
    return { success: false, error: 'Invalid recovery secret.', status: 401 };
  }

  const norm = emailOrUsername.toLowerCase().trim();
  let ownerUser: DbUser | undefined;
  for (const u of users.values()) {
    if ((u.email.toLowerCase() === norm || u.username.toLowerCase() === norm) && u.role === 'owner') {
      ownerUser = u;
      break;
    }
  }

  if (!ownerUser) {
    return { success: false, error: 'No owner account matching the specified username/email was found.', status: 404 };
  }

  const passCheck = validateStrongPassword(newPassword);
  if (!passCheck.valid) {
    return { success: false, error: passCheck.reason, status: 400 };
  }

  const newSalt = generateSalt();
  ownerUser.passwordSalt = newSalt;
  ownerUser.passwordHash = hashPassword(newPassword, newSalt);

  // Invalidate all prior active sessions for security
  for (const [tokenKey, sess] of sessions.entries()) {
    if (sess.userId === ownerUser.id) {
      sessions.delete(tokenKey);
    }
  }

  persistUsers();
  persistSessions();

  addAuditLog(ownerUser.id, 'OWNER_CREDENTIALS_ROTATED_VIA_RECOVERY_SECRET', { username: ownerUser.username }, ip);

  return { success: true };
}

export function googleSignIn(params: {
  email: string;
  displayName: string;
  avatarUrl?: string;
  googleId?: string;
  ip?: string;
  userAgent?: string;
}): { user: DbUser; session: DbSession } {
  const { email, displayName, avatarUrl, ip = '127.0.0.1', userAgent = 'Google-Auth' } = params;
  let user = findUserByEmail(email);

  if (!user) {
    const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    let finalUsername = baseUsername;
    let counter = 1;
    while (findUserByUsername(finalUsername)) {
      finalUsername = `${baseUsername}_${counter++}`;
    }

    const salt = generateSalt();
    user = {
      id: `user_${Date.now()}_g_${Math.random().toString(36).substring(2, 6)}`,
      email: email.toLowerCase().trim(),
      username: finalUsername,
      displayName: displayName || finalUsername,
      avatarUrl: avatarUrl || '/src/assets/images/zangi_creator_tech_1791614790487.jpg',
      bio: 'Zan-Gi Community Member. Authenticated with Google Workspace.',
      passwordSalt: salt,
      passwordHash: hashPassword(generateToken(), salt),
      isVerified: false,
      isEmailVerified: true,
      role: 'user',
      followersCount: 0,
      followingCount: 0,
      creatorCoins: 200,
      languagePreference: 'bn',
      createdAt: new Date().toISOString(),
      isDeactivated: false,
      isPrivate: false,
      whoCanComment: 'everyone',
      whoCanMessage: 'everyone',
      blockedUserIds: [],
      notificationPreferences: {
        likes: true,
        comments: true,
        follows: true,
        messages: true,
        systemUpdates: true,
        creatorEarn: true,
      },
      mediaPreferences: {
        dataSaver: false,
        autoplay: true,
        mediaQuality: 'standard',
      },
    };

    users.set(user.id, user);
    persistUsers();
    addAuditLog(user.id, 'GOOGLE_SIGNIN_CREATED', { email }, ip);
  } else {
    if (user.isDeactivated) user.isDeactivated = false;
    persistUsers();
    addAuditLog(user.id, 'GOOGLE_SIGNIN_LOGIN', { email }, ip);
  }

  const token = generateToken();
  const session: DbSession = {
    token,
    userId: user.id,
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    ip,
    userAgent,
  };

  sessions.set(token, session);
  persistSessions();

  return { user, session };
}

export function validateSession(token: string): DbUser | null {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    persistSessions();
    return null;
  }

  const user = users.get(session.userId);
  if (!user || user.isBanned || user.isDeactivated) {
    return null;
  }

  return user;
}

export function revokeSession(token: string): boolean {
  const sess = sessions.get(token);
  if (sess) {
    sessions.delete(token);
    persistSessions();
    addAuditLog(sess.userId, 'SESSION_LOGOUT', {}, sess.ip);
    return true;
  }
  return false;
}

export function verifyEmail(userId: string, code: string): { success: boolean; error?: string } {
  const user = users.get(userId);
  if (!user) return { success: false, error: 'User not found' };

  if (user.emailVerificationToken && user.emailVerificationToken === code.trim()) {
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    persistUsers();
    addAuditLog(user.id, 'EMAIL_VERIFIED', {}, '127.0.0.1');
    return { success: true };
  }
  return { success: false, error: 'Invalid or expired verification code' };
}

export function forgotPassword(email: string): { resetToken?: string; error?: string } {
  const user = findUserByEmail(email);
  if (!user) {
    return { resetToken: 'DEMO-RESET-CODE' };
  }

  const resetToken = generateVerificationCode();
  user.passwordResetToken = resetToken;
  user.passwordResetExpires = Date.now() + 15 * 60 * 1000;
  persistUsers();
  addAuditLog(user.id, 'PASSWORD_RESET_REQUESTED', {}, '127.0.0.1');

  return { resetToken };
}

export function resetPassword(token: string, newPassword: string): { success: boolean; error?: string } {
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'New password must be at least 6 characters' };
  }

  let targetUser: DbUser | undefined;
  for (const user of users.values()) {
    if (user.passwordResetToken === token.trim()) {
      if (user.passwordResetExpires && Date.now() > user.passwordResetExpires) {
        return { success: false, error: 'Password reset code has expired. Please request a new one.' };
      }
      targetUser = user;
      break;
    }
  }

  if (!targetUser) {
    return { success: false, error: 'Invalid recovery code' };
  }

  const salt = generateSalt();
  targetUser.passwordSalt = salt;
  targetUser.passwordHash = hashPassword(newPassword, salt);
  targetUser.passwordResetToken = undefined;
  targetUser.passwordResetExpires = undefined;

  // Revoke all active sessions for security
  for (const [sessToken, session] of sessions.entries()) {
    if (session.userId === targetUser.id) {
      sessions.delete(sessToken);
    }
  }

  persistUsers();
  persistSessions();
  addAuditLog(targetUser.id, 'PASSWORD_RESET_SUCCESS', {}, '127.0.0.1');
  return { success: true };
}

export function updateUserProfile(
  userId: string,
  patch: {
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
    bannerUrl?: string;
    username?: string;
    languagePreference?: 'bn' | 'en';
  }
): { user?: DbUser; error?: string } {
  const user = users.get(userId);
  if (!user) return { error: 'User not found' };

  if (patch.username && patch.username !== user.username) {
    const existing = findUserByUsername(patch.username);
    if (existing && existing.id !== user.id) {
      return { error: 'Username already in use.' };
    }
    user.username = patch.username.toLowerCase().trim();
  }

  if (patch.displayName !== undefined) user.displayName = patch.displayName.trim();
  if (patch.bio !== undefined) user.bio = patch.bio.trim();
  if (patch.avatarUrl !== undefined) user.avatarUrl = patch.avatarUrl.trim();
  if (patch.bannerUrl !== undefined) user.bannerUrl = patch.bannerUrl.trim();
  if (patch.languagePreference !== undefined) user.languagePreference = patch.languagePreference;

  persistUsers();
  addAuditLog(user.id, 'PROFILE_UPDATED', patch, '127.0.0.1');
  return { user };
}

// Profile Visit Deduplication cache: key (`${targetUserId}:${visitorKey}`) -> lastVisitTimestamp
const profileVisitCache = new Map<string, number>();

export function recordProfileVisit(
  targetUserId: string,
  visitorIdentifier: string
): { visited: boolean; profileVisitsCount: number } {
  const targetUser = users.get(targetUserId);
  if (!targetUser) return { visited: false, profileVisitsCount: 0 };

  // Never count self-visits
  if (targetUserId === visitorIdentifier) {
    return { visited: false, profileVisitsCount: targetUser.profileVisitsCount || 0 };
  }

  const cacheKey = `${targetUserId}:${visitorIdentifier}`;
  const lastVisit = profileVisitCache.get(cacheKey) || 0;
  const now = Date.now();
  // 1-hour anti-inflation cooldown window per visitor
  if (now - lastVisit < 3600 * 1000) {
    return { visited: false, profileVisitsCount: targetUser.profileVisitsCount || 0 };
  }

  profileVisitCache.set(cacheKey, now);
  targetUser.profileVisitsCount = (targetUser.profileVisitsCount || 0) + 1;
  persistUsers();

  return { visited: true, profileVisitsCount: targetUser.profileVisitsCount };
}

export function deactivateUser(userId: string, passwordConfirm: string): { success: boolean; error?: string } {
  const user = users.get(userId);
  if (!user) return { success: false, error: 'User not found' };

  const hash = hashPassword(passwordConfirm, user.passwordSalt);
  if (hash !== user.passwordHash) {
    return { success: false, error: 'Password confirmation failed.' };
  }

  user.isDeactivated = true;

  // Revoke all sessions
  for (const [sessToken, session] of sessions.entries()) {
    if (session.userId === user.id) sessions.delete(sessToken);
  }

  persistUsers();
  persistSessions();
  addAuditLog(user.id, 'ACCOUNT_DEACTIVATED', {}, '127.0.0.1');
  return { success: true };
}

export function deleteUserAccount(
  userId: string,
  passwordConfirm: string
): { success: boolean; error?: string } {
  const user = users.get(userId);
  if (!user) return { success: false, error: 'User not found' };

  const hash = hashPassword(passwordConfirm, user.passwordSalt);
  if (hash !== user.passwordHash) {
    return { success: false, error: 'Password confirmation failed.' };
  }

  // Revoke all sessions
  for (const [sessToken, session] of sessions.entries()) {
    if (session.userId === user.id) sessions.delete(sessToken);
  }

  users.delete(userId);
  persistUsers();
  persistSessions();
  addAuditLog(userId, 'ACCOUNT_PERMANENTLY_DELETED', {}, '127.0.0.1');
  return { success: true };
}

// Change Password with current password verification
export function changePassword(
  userId: string,
  currentPass: string,
  newPass: string,
  ip: string = '127.0.0.1'
): { success: boolean; error?: string } {
  const user = users.get(userId);
  if (!user) return { success: false, error: 'User not found' };

  if (!newPass || newPass.length < 6) {
    return { success: false, error: 'New password must be at least 6 characters long.' };
  }

  const currentHash = hashPassword(currentPass, user.passwordSalt);
  if (currentHash !== user.passwordHash) {
    addAuditLog(user.id, 'CHANGE_PASSWORD_FAILED', { reason: 'bad_current_password' }, ip);
    return { success: false, error: 'Current password is incorrect.' };
  }

  const newSalt = generateSalt();
  user.passwordSalt = newSalt;
  user.passwordHash = hashPassword(newPass, newSalt);

  persistUsers();
  addAuditLog(user.id, 'CHANGE_PASSWORD_SUCCESS', {}, ip);
  return { success: true };
}

// Privacy Settings
export function updatePrivacySettings(
  userId: string,
  patch: {
    isPrivate?: boolean;
    whoCanComment?: 'everyone' | 'followers' | 'none';
    whoCanMessage?: 'everyone' | 'followers' | 'none';
  }
): { user?: DbUser; error?: string } {
  const user = users.get(userId);
  if (!user) return { error: 'User not found' };

  if (patch.isPrivate !== undefined) user.isPrivate = patch.isPrivate;
  if (patch.whoCanComment !== undefined) user.whoCanComment = patch.whoCanComment;
  if (patch.whoCanMessage !== undefined) user.whoCanMessage = patch.whoCanMessage;

  persistUsers();
  addAuditLog(user.id, 'PRIVACY_UPDATED', patch, '127.0.0.1');
  return { user };
}

// Block and Unblock Users
export function blockUser(userId: string, targetUserId: string): { success: boolean; error?: string } {
  if (userId === targetUserId) {
    return { success: false, error: 'You cannot block yourself.' };
  }
  const user = users.get(userId);
  const target = users.get(targetUserId);
  if (!user || !target) return { success: false, error: 'User not found' };

  if (!user.blockedUserIds) user.blockedUserIds = [];
  if (!user.blockedUserIds.includes(targetUserId)) {
    user.blockedUserIds.push(targetUserId);
  }

  persistUsers();
  addAuditLog(user.id, 'USER_BLOCKED', { targetUserId }, '127.0.0.1');
  return { success: true };
}

export function unblockUser(userId: string, targetUserId: string): { success: boolean; error?: string } {
  const user = users.get(userId);
  if (!user) return { success: false, error: 'User not found' };

  if (user.blockedUserIds) {
    user.blockedUserIds = user.blockedUserIds.filter((id) => id !== targetUserId);
  }

  persistUsers();
  addAuditLog(user.id, 'USER_UNBLOCKED', { targetUserId }, '127.0.0.1');
  return { success: true };
}

export function getBlockedUsers(userId: string): { id: string; username: string; displayName: string; avatarUrl: string }[] {
  const user = users.get(userId);
  if (!user || !user.blockedUserIds) return [];

  const list: { id: string; username: string; displayName: string; avatarUrl: string }[] = [];
  for (const bid of user.blockedUserIds) {
    const bUser = users.get(bid);
    if (bUser) {
      list.push({
        id: bUser.id,
        username: bUser.username,
        displayName: bUser.displayName,
        avatarUrl: bUser.avatarUrl,
      });
    }
  }
  return list;
}

// Session Management
export function getUserSessions(userId: string, currentToken: string): any[] {
  const result: any[] = [];
  for (const [token, session] of sessions.entries()) {
    if (session.userId === userId && Date.now() <= session.expiresAt) {
      result.push({
        tokenSnippet: token.substring(0, 8) + '...',
        fullToken: token,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        ip: session.ip || '127.0.0.1',
        userAgent: session.userAgent || 'Unknown Browser',
        isCurrent: token === currentToken,
      });
    }
  }
  return result;
}

export function revokeSessionById(userId: string, tokenToRevoke: string): boolean {
  const session = sessions.get(tokenToRevoke);
  if (session && session.userId === userId) {
    sessions.delete(tokenToRevoke);
    persistSessions();
    addAuditLog(userId, 'SESSION_REVOKED', { revokedTokenSnippet: tokenToRevoke.substring(0, 8) }, '127.0.0.1');
    return true;
  }
  return false;
}

export function revokeOtherSessions(userId: string, currentToken: string): number {
  let count = 0;
  for (const [token, session] of sessions.entries()) {
    if (session.userId === userId && token !== currentToken) {
      sessions.delete(token);
      count++;
    }
  }
  persistSessions();
  addAuditLog(userId, 'OTHER_SESSIONS_REVOKED', { countRevoked: count }, '127.0.0.1');
  return count;
}

// ----------------------------------------------------
// Real Two-Factor Authentication Setup & Verification
// ----------------------------------------------------
export function setup2FA(userId: string): { secret: string; uri: string; recoveryCodes: string[]; error?: string } {
  const user = users.get(userId);
  if (!user) return { secret: '', uri: '', recoveryCodes: [], error: 'User not found' };

  // Generate 20-byte base32 secret
  const rawBytes = crypto.randomBytes(20);
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  for (let i = 0; i < rawBytes.length; i++) {
    secret += base32Chars[rawBytes[i] % 32];
  }

  // Generate 8 alphanumeric backup recovery codes
  const recoveryCodes = Array.from({ length: 8 }, () =>
    `${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
  );

  user.twoFactorSecret = secret;
  user.twoFactorRecoveryCodes = recoveryCodes;
  persistUsers();

  const uri = `otpauth://totp/Zan-Gi:${encodeURIComponent(user.email)}?secret=${secret}&issuer=Zan-Gi%20Universe`;

  addAuditLog(user.id, '2FA_SETUP_INITIATED', {}, '127.0.0.1');
  return { secret, uri, recoveryCodes };
}

export function verifyAndEnable2FA(userId: string, code: string): { success: boolean; error?: string } {
  const user = users.get(userId);
  if (!user || !user.twoFactorSecret) {
    return { success: false, error: '2FA setup was not initiated. Please start setup first.' };
  }

  const cleanCode = code.trim().replace(/\s+/g, '');
  const isTotpValid = verifyTotpCode(user.twoFactorSecret, cleanCode);
  const isRecoveryCode = user.twoFactorRecoveryCodes?.includes(cleanCode.toUpperCase());

  if (!isTotpValid && !isRecoveryCode) {
    return {
      success: false,
      error: 'Invalid 6-digit verification code. Please check your authenticator app and try again.',
    };
  }

  user.twoFactorEnabled = true;
  persistUsers();
  addAuditLog(user.id, '2FA_ENABLED_SUCCESS', { method: isRecoveryCode ? 'recovery_code' : 'totp' }, '127.0.0.1');
  return { success: true };
}

export function disable2FA(userId: string, passwordConfirm: string): { success: boolean; error?: string } {
  const user = users.get(userId);
  if (!user) return { success: false, error: 'User not found' };

  const hash = hashPassword(passwordConfirm, user.passwordSalt);
  if (hash !== user.passwordHash) {
    return { success: false, error: 'Password confirmation failed.' };
  }

  user.twoFactorEnabled = false;
  user.twoFactorSecret = undefined;
  user.twoFactorRecoveryCodes = undefined;

  persistUsers();
  addAuditLog(user.id, '2FA_DISABLED', {}, '127.0.0.1');
  return { success: true };
}

// Notification & Media Preferences
export function updateNotificationPreferences(userId: string, prefs: any): { user?: DbUser; error?: string } {
  const user = users.get(userId);
  if (!user) return { error: 'User not found' };

  user.notificationPreferences = {
    likes: prefs.likes ?? true,
    comments: prefs.comments ?? true,
    follows: prefs.follows ?? true,
    messages: prefs.messages ?? true,
    systemUpdates: prefs.systemUpdates ?? true,
    creatorEarn: prefs.creatorEarn ?? true,
  };

  persistUsers();
  addAuditLog(user.id, 'NOTIFICATIONS_PREFERENCES_UPDATED', prefs, '127.0.0.1');
  return { user };
}

export function updateMediaPreferences(userId: string, prefs: any): { user?: DbUser; error?: string } {
  const user = users.get(userId);
  if (!user) return { error: 'User not found' };

  user.mediaPreferences = {
    dataSaver: prefs.dataSaver ?? false,
    autoplay: prefs.autoplay ?? true,
    mediaQuality: prefs.mediaQuality || 'standard',
  };

  persistUsers();
  addAuditLog(user.id, 'MEDIA_PREFERENCES_UPDATED', prefs, '127.0.0.1');
  return { user };
}

export function updateStoragePreferences(userId: string, prefs: any): { user?: DbUser; error?: string } {
  const user = users.get(userId);
  if (!user) return { error: 'User not found' };

  user.storagePreferences = {
    saveMediaToDevice: Boolean(prefs.saveMediaToDevice ?? user.storagePreferences?.saveMediaToDevice ?? false),
    autoDownload: Boolean(prefs.autoDownload ?? user.storagePreferences?.autoDownload ?? false),
    autoDownloadPhotos: prefs.autoDownloadPhotos ?? user.storagePreferences?.autoDownloadPhotos ?? 'never',
    autoDownloadVideos: prefs.autoDownloadVideos ?? user.storagePreferences?.autoDownloadVideos ?? 'never',
    autoDownloadVoiceNotes: prefs.autoDownloadVoiceNotes ?? user.storagePreferences?.autoDownloadVoiceNotes ?? 'wifi_only',
    wifiOnly: Boolean(prefs.wifiOnly ?? user.storagePreferences?.wifiOnly ?? true),
    saveToGallery: Boolean(prefs.saveToGallery ?? user.storagePreferences?.saveToGallery ?? false),
    cloudDelivery: Boolean(prefs.cloudDelivery ?? user.storagePreferences?.cloudDelivery ?? true),
    localOnlyMedia: Boolean(prefs.localOnlyMedia ?? user.storagePreferences?.localOnlyMedia ?? false),
  };

  persistUsers();
  addAuditLog(user.id, 'STORAGE_PREFERENCES_UPDATED', prefs, '127.0.0.1');
  return { user };
}

// Data Export Function (Personal Data Export excluding secrets)
export function getUserAccountExport(userId: string) {
  const user = users.get(userId);
  if (!user) return null;

  const safe = sanitizeUser(user);
  const userLogs = auditLogs
    .filter((log) => log.userId === userId)
    .map((log) => ({
      id: log.id,
      action: log.action,
      timestamp: log.timestamp,
      details: log.details,
    }));

  return {
    profile: safe,
    privacySettings: {
      isPrivate: Boolean(user.isPrivate),
      whoCanComment: user.whoCanComment || 'everyone',
      whoCanMessage: user.whoCanMessage || 'everyone',
      blockedUserIdsCount: user.blockedUserIds?.length || 0,
    },
    securitySettings: {
      twoFactorEnabled: Boolean(user.twoFactorEnabled),
      isEmailVerified: Boolean(user.isEmailVerified),
      createdAt: user.createdAt,
    },
    notificationPreferences: user.notificationPreferences,
    mediaPreferences: user.mediaPreferences,
    activityAuditLogs: userLogs,
  };
}

// Admin / Owner Operations
export function getAllUsersAdmin(adminUserId: string): any[] {
  const admin = users.get(adminUserId);
  if (!admin || (admin.role !== 'owner' && admin.role !== 'admin')) {
    throw new Error('Unauthorized: Admin or Owner role required.');
  }

  const list: any[] = [];
  for (const u of users.values()) {
    list.push({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      email: u.email,
      avatarUrl: u.avatarUrl,
      role: u.role,
      isVerified: u.isVerified,
      isEmailVerified: u.isEmailVerified,
      isDeactivated: u.isDeactivated,
      isBanned: Boolean(u.isBanned),
      creatorCoins: u.creatorCoins || 0,
      isPremium: Boolean(u.isPremium),
      premiumTier: u.premiumTier,
      createdAt: u.createdAt,
    });
  }
  return list;
}

export function adminUpdateUser(
  adminUserId: string,
  targetUserId: string,
  patch: {
    role?: 'owner' | 'admin' | 'creator' | 'user';
    isVerified?: boolean;
    isBanned?: boolean;
    creatorCoins?: number;
    isPremium?: boolean;
    premiumTier?: 'basic' | 'pro' | 'creator_plus';
  }
): { user?: DbUser; error?: string } {
  const admin = users.get(adminUserId);
  if (!admin || (admin.role !== 'owner' && admin.role !== 'admin')) {
    return { error: 'Unauthorized: Admin or Owner role required.' };
  }

  const target = users.get(targetUserId);
  if (!target) return { error: 'Target user not found' };

  if (target.role === 'owner' && admin.role !== 'owner') {
    return { error: 'Cannot modify platform owner account.' };
  }

  if (patch.role !== undefined) target.role = patch.role;
  if (patch.isVerified !== undefined) target.isVerified = patch.isVerified;
  if (patch.creatorCoins !== undefined) target.creatorCoins = Math.max(0, patch.creatorCoins);
  if (patch.isPremium !== undefined) target.isPremium = patch.isPremium;
  if (patch.premiumTier !== undefined) target.premiumTier = patch.premiumTier;
  if (patch.isBanned !== undefined) {
    target.isBanned = patch.isBanned;
    if (patch.isBanned) {
      for (const [sToken, sess] of sessions.entries()) {
        if (sess.userId === target.id) sessions.delete(sToken);
      }
      persistSessions();
    }
  }

  persistUsers();
  addAuditLog(admin.id, 'ADMIN_USER_MODIFIED', { targetUserId, patch }, '127.0.0.1');
  return { user: target };
}

export function getSystemUserCount(): number {
  return users.size;
}

export function getActiveSessionsCount(): number {
  return sessions.size;
}

export function updateUserCoins(userId: string, coinsOrDelta: number, isDelta: boolean = false): number {
  const user = users.get(userId);
  if (!user) return 0;
  if (isDelta) {
    user.creatorCoins = Math.max(0, (user.creatorCoins || 0) + coinsOrDelta);
  } else {
    user.creatorCoins = Math.max(0, coinsOrDelta);
  }
  persistUsers();
  return user.creatorCoins;
}

export function updateUserPremiumStatus(
  userId: string,
  isPremium: boolean,
  tier: 'basic' | 'pro' | 'creator_plus' = 'pro',
  durationDays: number = 30
): { success: boolean; user?: DbUser; error?: string } {
  const user = users.get(userId);
  if (!user) return { success: false, error: 'User not found' };

  user.isPremium = isPremium;
  user.premiumTier = isPremium ? tier : undefined;
  user.premiumExpiresAt = isPremium
    ? new Date(Date.now() + durationDays * 86400000).toISOString()
    : undefined;

  persistUsers();
  addAuditLog(user.id, 'PREMIUM_STATUS_UPDATED', { isPremium, tier, durationDays }, '127.0.0.1');
  return { success: true, user };
}

export interface PremiumPlan {
  id: 'creator_pro' | 'creator_vip' | 'creator_elite';
  name: string;
  nameBn: string;
  tier: 'basic' | 'pro' | 'creator_plus';
  durationDays: number;
  durationLabel: string;
  durationLabelBn: string;
  priceInCoins: number;
  benefits: string[];
  benefitsBn: string[];
  isPopular?: boolean;
}

export const PREMIUM_PLANS: PremiumPlan[] = [
  {
    id: 'creator_pro',
    name: 'Creator Pro',
    nameBn: 'ক্রিয়েটর প্রো',
    tier: 'basic',
    durationDays: 30,
    durationLabel: '1 Month',
    durationLabelBn: '১ মাস',
    priceInCoins: 500,
    benefits: [
      '+20% AI Generation Rate Limit Boost',
      'Verified Pro Subscriber Badge',
      'Priority Video Upload & Adaptive Encoding',
      'Full 1-3 Minute High-Quality Video Support',
      'Direct Creator Tipping Eligibility'
    ],
    benefitsBn: [
      '+২০% এআই জেনারেশন স্পিড ও রেট লিমিট বৃদ্ধি',
      'ভেরিফায়েড প্রো সাবস্ক্রাইবার ব্যাজ',
      'অগ্রাধিকার ভিডিও আপলোড ও এনকোডিং',
      '১-৩ মিনিটের পূর্ণাঙ্গ এইচডি ভিডিও সাপোর্ট',
      'সরাসরি ক্রিয়েটর টিপিং সুবিধা'
    ],
    isPopular: true
  },
  {
    id: 'creator_vip',
    name: 'Creator VIP',
    nameBn: 'ক্রিয়েটর ভিআইপি',
    tier: 'pro',
    durationDays: 90,
    durationLabel: '3 Months (Save 300 Coins)',
    durationLabelBn: '৩ মাস (৩০০ কয়েন সাশ্রয়)',
    priceInCoins: 1200,
    benefits: [
      'All Creator Pro Benefits Included',
      'Ad-Free Experience on Feed and Reels',
      'Custom Animated Profile Badges',
      'Priority 24/7 Creator Support',
      'Higher Scheduled Post Queue (Up to 30)'
    ],
    benefitsBn: [
      'ক্রিয়েটর প্রো-এর সকল সুবিধাসমূহ অন্তর্ভুক্ত',
      'বিজ্ঞাপনমুক্ত ফিড এবং রিলস ব্রাউজিং',
      'কাস্টম অ্যানিমেটেড প্রোফাইল ব্যাজ',
      'অগ্রাধিকার ২৪/৭ ক্রিয়েটর সাপোর্ট',
      'একসাথে ৩০টি পোস্ট শিডিউল করার সুযোগ'
    ]
  },
  {
    id: 'creator_elite',
    name: 'Creator Elite (Annual)',
    nameBn: 'ক্রিয়েটর এলিট (বার্ষিক)',
    tier: 'creator_plus',
    durationDays: 365,
    durationLabel: '1 Year (Best Value)',
    durationLabelBn: '১ বছর (সেরা মূল্য)',
    priceInCoins: 4000,
    benefits: [
      'All VIP Benefits for 1 Full Year',
      'Exclusive Golden Star Creator Verification',
      'Zero Fee Payout Processing',
      'Early Access to Next-Gen AI Models',
      'Direct Feature Voting Rights in Zan-Gi Studio'
    ],
    benefitsBn: [
      'পূর্ণ ১ বছরের জন্য ভিআইপি-এর সকল সুবিধা',
      'স্বর্ণালী এক্সক্লুসিভ স্টার ক্রিয়েটর ভেরিফিকেশন',
      'উত্তোলনে শূন্য প্রসেসিং ফি সুবিধা',
      'নতুন প্রজন্মের এআই মডেলের আর্লি অ্যাক্সেস',
      'Zan-Gi স্টুডিও ফিচার নির্ধারণে ভোটিং ক্ষমতা'
    ]
  }
];

export function purchasePremiumPlan(
  userId: string,
  planId: string,
  ip: string = '127.0.0.1'
): { success: boolean; user?: DbUser; plan?: PremiumPlan; error?: string } {
  const user = users.get(userId);
  if (!user) return { success: false, error: 'User not found' };

  const plan = PREMIUM_PLANS.find(p => p.id === planId || `plan_${p.id}` === planId || p.id === planId.replace(/^plan_/, ''));
  if (!plan) {
    return { success: false, error: 'Invalid subscription plan selected' };
  }

  const currentCoins = user.creatorCoins || 0;
  if (currentCoins < plan.priceInCoins) {
    return {
      success: false,
      error: `Insufficient Creator Coins. Plan costs ${plan.priceInCoins} coins, but your current balance is ${currentCoins} coins.`
    };
  }

  // Atomically deduct coins
  user.creatorCoins = currentCoins - plan.priceInCoins;

  // Calculate new expiry date (extend if already active)
  let baseExpiry = Date.now();
  if (user.isPremium && user.premiumExpiresAt) {
    const currentExpiry = new Date(user.premiumExpiresAt).getTime();
    if (currentExpiry > baseExpiry) {
      baseExpiry = currentExpiry;
    }
  }
  const newExpiry = new Date(baseExpiry + plan.durationDays * 86400000).toISOString();

  user.isPremium = true;
  user.premiumTier = plan.tier;
  user.premiumExpiresAt = newExpiry;

  persistUsers();

  // Record audit log
  addAuditLog(user.id, 'PREMIUM_SUBSCRIPTION_PURCHASED', {
    planId: plan.id,
    planName: plan.name,
    tier: plan.tier,
    priceInCoins: plan.priceInCoins,
    durationDays: plan.durationDays,
    expiresAt: newExpiry,
    remainingCoins: user.creatorCoins
  }, ip);

  return { success: true, user, plan };
}

export function getPremiumSubscriptionDetails(userId: string) {
  const user = users.get(userId);
  if (!user) return null;

  const isPremium = Boolean(user.isPremium || user.role === 'owner');
  const now = Date.now();
  const expiresAt = user.premiumExpiresAt ? new Date(user.premiumExpiresAt).getTime() : 0;
  const daysRemaining = expiresAt > now ? Math.ceil((expiresAt - now) / 86400000) : 0;

  return {
    isPremium,
    tier: user.premiumTier || (isPremium ? 'pro' : 'free'),
    expiresAt: user.premiumExpiresAt || null,
    daysRemaining,
    coinBalance: user.creatorCoins || 0,
    availablePlans: PREMIUM_PLANS,
    benefits: {
      aiThroughputBoostPercent: 20,
      aiRateLimitPerMin: isPremium ? 24 : 20,
      maxCharAnalysisLength: isPremium ? 3600 : 3000,
      videoMaxDurationSeconds: 180,
      priorityVideoTranscoding: isPremium,
      verifiedSubscriberBadge: isPremium,
      adFreeExperienceEligible: isPremium,
    },
  };
}

export function getUserCoinTransactionHistory(userId: string) {
  const coinActions = [
    'PREMIUM_SUBSCRIPTION_PURCHASED',
    'COIN_TIP_SENT',
    'COIN_TIP_RECEIVED',
    'REWARDED_AD_CLAIM',
    'CREATOR_WITHDRAWAL_REQUESTED',
    'CREATOR_WITHDRAWAL_REJECTED_REFUND'
  ];
  return auditLogs
    .filter(l => l.userId === userId && coinActions.includes(l.action))
    .map(l => ({
      id: l.id,
      action: l.action,
      timestamp: l.timestamp,
      details: l.details,
    }));
}

