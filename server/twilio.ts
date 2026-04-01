// Twilio integration using Replit connector
import twilio from 'twilio';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=twilio',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.account_sid || !connectionSettings.settings.api_key || !connectionSettings.settings.api_key_secret)) {
    throw new Error('Twilio not connected');
  }
  return {
    accountSid: connectionSettings.settings.account_sid,
    apiKey: connectionSettings.settings.api_key,
    apiKeySecret: connectionSettings.settings.api_key_secret,
    phoneNumber: connectionSettings.settings.phone_number
  };
}

export async function getTwilioClient() {
  const { accountSid, apiKey, apiKeySecret } = await getCredentials();
  return twilio(apiKey, apiKeySecret, {
    accountSid: accountSid
  });
}

export async function getTwilioFromPhoneNumber() {
  const { phoneNumber } = await getCredentials();
  return phoneNumber;
}

/**
 * Normalize a phone number to E.164 format.
 * - Strips ALL non-digit characters first.
 * - If 10 digits, assumes US and prepends +1.
 * - If 11 digits starting with 1, prepends +.
 * - Otherwise prepends + (for international numbers).
 * - Throws early if the digit count is implausibly short (< 7).
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) {
    throw new Error(`Phone number "${phone}" is too short to be valid.`);
  }
  if (digits.length > 15) {
    throw new Error(`Phone number "${phone}" exceeds the maximum E.164 length.`);
  }
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return `+${digits}`;
}

/**
 * Send an invite SMS via the Twilio Messages API.
 * Throws on failure so callers can surface the real error to the user.
 */
export async function sendSmsOtp(toPhoneNumber: string, body: string): Promise<void> {
  const client = await getTwilioClient();
  const fromNumber = await getTwilioFromPhoneNumber();
  const to = normalizePhone(toPhoneNumber);

  // If the from value looks like a Messaging Service SID (starts with MG), use messagingServiceSid
  if (fromNumber && fromNumber.startsWith('MG')) {
    await client.messages.create({ body, to, messagingServiceSid: fromNumber });
  } else {
    await client.messages.create({ body, to, from: fromNumber });
  }
}

/**
 * Send a 2FA OTP via Twilio Verify.
 * Uses the Verify Service SID from the TwillioACP2FA environment variable.
 * Throws on failure.
 */
export async function sendVerifyOtp(toPhone: string): Promise<void> {
  const serviceSid = process.env.TwillioACP2FA;
  if (!serviceSid) {
    throw new Error('Twilio Verify Service SID (TwillioACP2FA) is not configured');
  }

  const client = await getTwilioClient();
  const to = normalizePhone(toPhone);

  await client.verify.v2.services(serviceSid).verifications.create({
    to,
    channel: 'sms'
  });
}

/**
 * Check a Twilio Verify OTP entered by the user.
 * Returns true if the code is correct and approved.
 */
export async function checkVerifyOtp(toPhone: string, code: string): Promise<boolean> {
  const serviceSid = process.env.TwillioACP2FA;
  if (!serviceSid) {
    throw new Error('Twilio Verify Service SID (TwillioACP2FA) is not configured');
  }

  const client = await getTwilioClient();
  const to = normalizePhone(toPhone);

  const check = await client.verify.v2.services(serviceSid).verificationChecks.create({
    to,
    code
  });

  return check.status === 'approved';
}
