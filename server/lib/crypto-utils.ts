import crypto from "crypto";

const CONTACT_HASH_SECRET = process.env.CONTACT_HASH_SECRET || 'acp-friend-discovery-secret-key-change-in-production';

export function hashContact(identifier: string): string {
  if (!identifier || typeof identifier !== 'string') {
    throw new Error('Invalid identifier for hashing');
  }
  
  const normalized = identifier.toLowerCase().trim().replace(/\s+/g, '');
  
  const hash = crypto
    .createHmac('sha256', CONTACT_HASH_SECRET)
    .update(normalized)
    .digest('hex');
  
  return hash;
}

export function normalizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return '';
  }
  return email.toLowerCase().trim();
}

export function normalizePhone(phone: string): string {
  if (!phone || typeof phone !== 'string') {
    return '';
  }
  return phone.replace(/\D/g, '');
}
