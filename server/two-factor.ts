import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { storage } from './storage';
import { sendVerifyOtp, checkVerifyOtp } from './twilio';

// CRITICAL: TOTP encryption key must be stable across restarts
const ENCRYPTION_KEY_HEX = process.env.TOTP_ENCRYPTION_KEY;
if (!ENCRYPTION_KEY_HEX) {
  console.warn('WARNING: TOTP_ENCRYPTION_KEY not set. 2FA TOTP will not persist across restarts!');
  console.warn('Generate a stable key: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  if (process.env.NODE_ENV === 'production') {
    console.error('CRITICAL: TOTP_ENCRYPTION_KEY not set in production. TOTP 2FA will not persist across restarts.');
  }
}
const ENCRYPTION_KEY = ENCRYPTION_KEY_HEX || randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

export function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateDeviceToken(): string {
  return randomBytes(32).toString('hex');
}

function encryptTotpSecret(secret: string): string {
  const keyBuffer = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, keyBuffer, iv, { authTagLength: AUTH_TAG_LENGTH });
  
  let encrypted = cipher.update(secret, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
}

function decryptTotpSecret(encryptedSecret: string): string {
  const keyBuffer = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');
  const [ivHex, encrypted, authTagHex] = encryptedSecret.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = createDecipheriv(ALGORITHM, keyBuffer, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

export async function setupTotp(userId: string, username: string): Promise<{ secret: string; otpauthUrl: string; qrCode: string }> {
  const secret = speakeasy.generateSecret({
    name: `ACP:${username}`,
    length: 32
  });
  
  const encryptedSecret = encryptTotpSecret(secret.base32);
  
  await storage.updateUser(userId, {
    totpSecret: encryptedSecret,
    totpEnabled: false
  });
  
  const qrCode = await QRCode.toDataURL(secret.otpauth_url || '');
  
  return {
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url || '',
    qrCode
  };
}

export async function verifyTotp(userId: string, token: string): Promise<boolean> {
  const user = await storage.getUser(userId);
  if (!user || !user.totpSecret) {
    return false;
  }
  
  try {
    const secret = decryptTotpSecret(user.totpSecret);
    
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1
    });
    
    return verified;
  } catch (error) {
    console.error('TOTP verification error:', error);
    return false;
  }
}

export async function confirmTotpSetup(userId: string, token: string): Promise<boolean> {
  const verified = await verifyTotp(userId, token);
  
  if (verified) {
    await storage.updateUser(userId, {
      totpEnabled: true,
      twoFactorEnabled: true,
      twoFactorMethod: 'totp'
    });
    return true;
  }
  
  return false;
}

export async function disableTotp(userId: string): Promise<void> {
  await storage.updateUser(userId, {
    totpSecret: null,
    totpEnabled: false,
    twoFactorEnabled: false,
    twoFactorMethod: null
  });
}

/**
 * Send a 2FA OTP via Twilio Verify.
 * Throws on failure so the caller can surface the real error.
 */
export async function sendSms2FA(userId: string, phoneNumber: string): Promise<void> {
  await sendVerifyOtp(phoneNumber);
}

/**
 * Verify a 2FA OTP via Twilio Verify.
 * Accepts an optional phone override — used during the enable flow
 * before the phone is saved to the user record.
 */
export async function verifySms2FA(userId: string, code: string, phone?: string): Promise<{ success: boolean; reason?: string }> {
  let toPhone = phone;
  if (!toPhone) {
    const user = await storage.getUser(userId);
    toPhone = user?.twoFactorPhone || undefined;
  }
  if (!toPhone) {
    return { success: false, reason: 'No phone number on file. Please re-enable SMS 2FA.' };
  }
  try {
    const approved = await checkVerifyOtp(toPhone, code);
    if (approved) {
      return { success: true };
    }
    return { success: false, reason: 'Invalid or expired code.' };
  } catch (error: any) {
    return { success: false, reason: error.message || 'Verification failed.' };
  }
}

export async function enableSms2FA(userId: string, phoneNumber: string): Promise<void> {
  await storage.updateUser(userId, {
    smsEnabled: true,
    twoFactorEnabled: true,
    twoFactorMethod: 'sms',
    twoFactorPhone: phoneNumber
  });
}

export async function disableSms2FA(userId: string): Promise<void> {
  await storage.updateUser(userId, {
    smsEnabled: false,
    twoFactorEnabled: false,
    twoFactorMethod: null,
    twoFactorPhone: null
  });
}

export async function createTrustedDevice(userId: string, userAgent: string, ipAddress: string): Promise<string> {
  const token = generateDeviceToken();
  const tokenHash = hashCode(token);
  const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
  
  await storage.createTrustedDevice(userId, tokenHash, userAgent, ipAddress, expiresAt);
  
  return token;
}

export async function verifyTrustedDevice(userId: string, token: string): Promise<boolean> {
  const tokenHash = hashCode(token);
  const isValid = await storage.verifyTrustedDevice(userId, tokenHash);
  return isValid;
}

export async function removeTrustedDevice(userId: string, deviceId: string): Promise<void> {
  await storage.removeTrustedDevice(userId, deviceId);
}

export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~;']/.test(password);
  const isLongEnough = password.length >= 16;
  
  if (!hasSymbol && !isLongEnough) {
    errors.push('Password must either contain a special character or be at least 16 characters long');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Challenge token for secure 2FA flow
const CHALLENGE_EXPIRY_MINUTES = 5;

export async function create2FAChallenge(userId: string): Promise<string> {
  const challengeToken = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + CHALLENGE_EXPIRY_MINUTES * 60 * 1000);
  
  await storage.create2FAChallenge(userId, challengeToken, expiresAt);
  return challengeToken;
}

export async function verify2FAChallenge(challengeToken: string): Promise<{ valid: boolean; userId?: string }> {
  return storage.verify2FAChallenge(challengeToken);
}

export async function delete2FAChallenge(challengeToken: string): Promise<void> {
  await storage.delete2FAChallenge(challengeToken);
}
