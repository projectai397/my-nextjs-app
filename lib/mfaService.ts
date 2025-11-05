/**
 * Multi-Factor Authentication Service
 * Supports SMS OTP, Email OTP, TOTP (Authenticator Apps)
 */

import crypto from 'crypto';
import * as OTPAuth from 'otpauth';

export interface MFAConfig {
  userId: string;
  method: 'sms' | 'email' | 'totp';
  enabled: boolean;
  secret?: string;
  backupCodes?: string[];
  trustedDevices?: TrustedDevice[];
}

export interface TrustedDevice {
  deviceId: string;
  deviceName: string;
  lastUsed: Date;
  ipAddress: string;
}

export interface OTPVerification {
  userId: string;
  code: string;
  method: 'sms' | 'email' | 'totp';
}

/**
 * Generate a secret key for TOTP
 */
export function generateTOTPSecret(): string {
  return crypto.randomBytes(20).toString('hex');
}

/**
 * Generate QR code data for authenticator apps
 */
export function generateQRCodeData(userId: string, secret: string, issuer: string = 'TradingPlatform'): string {
  const totp = new OTPAuth.TOTP({
    issuer,
    label: userId,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromHex(secret)
  });
  
  return totp.toString();
}

/**
 * Verify TOTP code from authenticator app
 */
export function verifyTOTP(secret: string, token: string): boolean {
  const totp = new OTPAuth.TOTP({
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromHex(secret)
  });
  
  // Allow 1 period before and after for clock skew
  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
}

/**
 * Generate a 6-digit OTP for SMS/Email
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate backup codes for account recovery
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`);
  }
  return codes;
}

/**
 * Hash backup code for storage
 */
export function hashBackupCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Verify backup code
 */
export function verifyBackupCode(code: string, hashedCode: string): boolean {
  const hash = hashBackupCode(code);
  return hash === hashedCode;
}

/**
 * Generate device fingerprint
 */
export function generateDeviceFingerprint(userAgent: string, ipAddress: string): string {
  const data = `${userAgent}|${ipAddress}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Send OTP via SMS (placeholder - integrate with Twilio/AWS SNS)
 */
export async function sendSMSOTP(phoneNumber: string, otp: string): Promise<boolean> {
  try {
    // TODO: Integrate with SMS provider (Twilio, AWS SNS, etc.)
    console.log(`Sending SMS OTP to ${phoneNumber}: ${otp}`);
    
    // Placeholder for actual SMS sending
    // const client = new Twilio(accountSid, authToken);
    // await client.messages.create({
    //   body: `Your verification code is: ${otp}`,
    //   from: twilioPhoneNumber,
    //   to: phoneNumber
    // });
    
    return true;
  } catch (error) {
    console.error('SMS OTP Error:', error);
    return false;
  }
}

/**
 * Send OTP via Email (placeholder - integrate with SendGrid/AWS SES)
 */
export async function sendEmailOTP(email: string, otp: string): Promise<boolean> {
  try {
    // TODO: Integrate with email provider (SendGrid, AWS SES, etc.)
    console.log(`Sending Email OTP to ${email}: ${otp}`);
    
    // Placeholder for actual email sending
    // const msg = {
    //   to: email,
    //   from: 'noreply@tradingplatform.com',
    //   subject: 'Your Verification Code',
    //   text: `Your verification code is: ${otp}`,
    //   html: `<strong>Your verification code is: ${otp}</strong>`
    // };
    // await sgMail.send(msg);
    
    return true;
  } catch (error) {
    console.error('Email OTP Error:', error);
    return false;
  }
}

/**
 * Store OTP in cache/database with expiration
 */
export interface OTPStorage {
  userId: string;
  otp: string;
  method: 'sms' | 'email';
  expiresAt: Date;
  attempts: number;
}

// In-memory storage for demo (use Redis in production)
const otpStore = new Map<string, OTPStorage>();

/**
 * Save OTP to storage
 */
export function saveOTP(userId: string, otp: string, method: 'sms' | 'email', expirationMinutes: number = 5): void {
  const key = `${userId}:${method}`;
  const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);
  
  otpStore.set(key, {
    userId,
    otp: hashBackupCode(otp), // Store hashed OTP
    method,
    expiresAt,
    attempts: 0
  });
  
  // Auto-cleanup after expiration
  setTimeout(() => {
    otpStore.delete(key);
  }, expirationMinutes * 60 * 1000);
}

/**
 * Verify OTP from storage
 */
export function verifyOTPFromStorage(userId: string, otp: string, method: 'sms' | 'email'): {
  valid: boolean;
  error?: string;
} {
  const key = `${userId}:${method}`;
  const stored = otpStore.get(key);
  
  if (!stored) {
    return { valid: false, error: 'OTP not found or expired' };
  }
  
  if (new Date() > stored.expiresAt) {
    otpStore.delete(key);
    return { valid: false, error: 'OTP expired' };
  }
  
  if (stored.attempts >= 3) {
    otpStore.delete(key);
    return { valid: false, error: 'Too many attempts' };
  }
  
  stored.attempts++;
  
  const isValid = verifyBackupCode(otp, stored.otp);
  
  if (isValid) {
    otpStore.delete(key);
    return { valid: true };
  }
  
  return { valid: false, error: 'Invalid OTP' };
}

/**
 * Check if device is trusted
 */
export function isDeviceTrusted(deviceId: string, trustedDevices: TrustedDevice[]): boolean {
  return trustedDevices.some(device => device.deviceId === deviceId);
}

/**
 * Add device to trusted list
 */
export function addTrustedDevice(
  deviceId: string,
  deviceName: string,
  ipAddress: string,
  trustedDevices: TrustedDevice[]
): TrustedDevice[] {
  const newDevice: TrustedDevice = {
    deviceId,
    deviceName,
    lastUsed: new Date(),
    ipAddress
  };
  
  // Keep only last 5 trusted devices
  const updated = [newDevice, ...trustedDevices].slice(0, 5);
  return updated;
}

/**
 * Remove device from trusted list
 */
export function removeTrustedDevice(deviceId: string, trustedDevices: TrustedDevice[]): TrustedDevice[] {
  return trustedDevices.filter(device => device.deviceId !== deviceId);
}

/**
 * Complete MFA setup for user
 */
export async function setupMFA(
  userId: string,
  method: 'sms' | 'email' | 'totp',
  contactInfo?: string
): Promise<{
  success: boolean;
  secret?: string;
  qrCode?: string;
  backupCodes?: string[];
  error?: string;
}> {
  try {
    if (method === 'totp') {
      const secret = generateTOTPSecret();
      const qrCode = generateQRCodeData(userId, secret);
      const backupCodes = generateBackupCodes();
      
      return {
        success: true,
        secret,
        qrCode,
        backupCodes
      };
    } else if (method === 'sms' || method === 'email') {
      if (!contactInfo) {
        return { success: false, error: 'Contact information required' };
      }
      
      const otp = generateOTP();
      saveOTP(userId, otp, method);
      
      if (method === 'sms') {
        await sendSMSOTP(contactInfo, otp);
      } else {
        await sendEmailOTP(contactInfo, otp);
      }
      
      const backupCodes = generateBackupCodes();
      
      return {
        success: true,
        backupCodes
      };
    }
    
    return { success: false, error: 'Invalid method' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Verify MFA code
 */
export async function verifyMFA(
  userId: string,
  code: string,
  method: 'sms' | 'email' | 'totp',
  secret?: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    if (method === 'totp') {
      if (!secret) {
        return { valid: false, error: 'Secret required for TOTP' };
      }
      const isValid = verifyTOTP(secret, code);
      return { valid: isValid, error: isValid ? undefined : 'Invalid code' };
    } else {
      return verifyOTPFromStorage(userId, code, method);
    }
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
}

// Export all functions
export default {
  generateTOTPSecret,
  generateQRCodeData,
  verifyTOTP,
  generateOTP,
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
  generateDeviceFingerprint,
  sendSMSOTP,
  sendEmailOTP,
  saveOTP,
  verifyOTPFromStorage,
  isDeviceTrusted,
  addTrustedDevice,
  removeTrustedDevice,
  setupMFA,
  verifyMFA
};
