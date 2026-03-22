import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
import { doubleCsrf } from "csrf-csrf";
import { scrypt, randomBytes, timingSafeEqual, createHash } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { User as SelectUser } from "@shared/schema";
import { getClientIp, getCountryFromIp } from "./ip-utils";
import { sendPasswordResetEmail } from "./email";
import { 
  setupTotp, 
  verifyTotp, 
  confirmTotpSetup, 
  disableTotp,
  sendSms2FA,
  verifySms2FA,
  enableSms2FA,
  disableSms2FA,
  createTrustedDevice,
  verifyTrustedDevice,
  validatePasswordStrength,
  hashCode,
  create2FAChallenge,
  verify2FAChallenge,
  delete2FAChallenge
} from "./two-factor";
import { RateLimiterMemory } from "rate-limiter-flexible";

declare module "express-session" {
  interface SessionData {
    csrfInitialized?: boolean;
  }
}

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

// Rate limiters for security - prevents brute force attacks
const loginLimiter = new RateLimiterMemory({
  points: 20, // 20 attempts
  duration: 60 * 15, // per 15 minutes
  blockDuration: 60 * 15, // block for 15 minutes if exceeded
});

const twoFactorLimiter = new RateLimiterMemory({
  points: 5, // 5 attempts
  duration: 60 * 5, // per 5 minutes
  blockDuration: 60 * 5, // block for 5 minutes if exceeded
});

const registrationLimiter = new RateLimiterMemory({
  points: 3, // 3 registrations
  duration: 60 * 60, // per hour
  blockDuration: 60 * 60, // block for 1 hour if exceeded
});

// Rate limiting middleware
const rateLimitMiddleware = (limiter: RateLimiterMemory) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = getClientIp(req);
      await limiter.consume(ip);
      next();
    } catch (rejRes) {
      res.status(429).json({ 
        message: "Too many attempts. Please try again later.",
        retryAfter: Math.round((rejRes as any).msBeforeNext / 1000) || 60
      });
    }
  };
};

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    const [hashed, salt] = (stored || "").split(".");
    if (!hashed || !salt) return false;
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    if (hashedBuf.length !== suppliedBuf.length) return false;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch {
    return false;
  }
}

export function setupAuth(app: Express) {
  const isProduction = process.env.NODE_ENV === "production";
  const csrfSecret = process.env.CSRF_SECRET || process.env.SESSION_SECRET!;

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  };

  app.set("trust proxy", 1);
  app.use(cookieParser(csrfSecret));
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
    getSecret: () => csrfSecret,
    getSessionIdentifier: (req) => req.session?.id || "",
    cookieName: "__csrf",
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      path: "/",
    },
    getCsrfTokenFromRequest: (req) => req.headers["x-csrf-token"] as string,
  });

  app.get("/api/csrf-token", (req, res) => {
    if (req.session && !req.session.csrfInitialized) {
      req.session.csrfInitialized = true;
      req.session.save((err) => {
        if (err) {
          console.error("Failed to save session for CSRF:", err);
        }
        const token = generateCsrfToken(req, res);
        res.json({ csrfToken: token });
      });
      return;
    }
    const token = generateCsrfToken(req, res);
    res.json({ csrfToken: token });
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    const safeMethods = ["GET", "HEAD", "OPTIONS"];
    if (safeMethods.includes(req.method)) {
      return next();
    }
    if (req.path.startsWith("/api/webhooks/")) {
      return next();
    }
    doubleCsrfProtection(req, res, next);
  });

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const identifier = username.trim();
      const user =
        (await storage.getUserByUsername(identifier)) ??
        (await storage.getUserByEmail(identifier)) ??
        (await storage.getUserByPhone(identifier));
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", rateLimitMiddleware(registrationLimiter), async (req, res, next) => {
    try {
      const { invitationToken, ...userData } = req.body;
      
      // Validate the invitation if one is provided
      let validation: any = null;
      if (invitationToken) {
        validation = await storage.validateInvitation(invitationToken, userData.email);
        if (!validation.valid) {
          return res.status(400).json({ message: validation.reason || "Invalid invitation" });
        }
      }

      // Validate password strength
      const passwordValidation = validatePasswordStrength(userData.password);
      if (!passwordValidation.valid) {
        return res.status(400).json({ 
          message: "Password does not meet security requirements",
          errors: passwordValidation.errors 
        });
      }

      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Check if this is the first user - if so, make them admin
      const userCount = await storage.getUserCount();
      const isFirstUser = userCount === 0;

      // Capture registration IP and country
      const registrationIp = getClientIp(req);
      const registrationCountry = await getCountryFromIp(registrationIp);

      const user = await storage.createUser({
        ...userData,
        password: await hashPassword(userData.password),
        role: isFirstUser ? "admin" : "citizen",
        registrationIp,
        registrationCountry,
        lastLoginIp: registrationIp,
        lastLoginCountry: registrationCountry,
      });

      // Mark invitation as used if one was provided
      if (invitationToken && validation) {
        await storage.useInvitation(invitationToken, user.id);
      }

      // Create automatic friend connections (Tom from MySpace style)
      try {
        // 1. Auto-friend with 'jox' user (the default friend for all new users)
        const joxUserId = await storage.getDefaultFriendUserId();
        if (joxUserId && joxUserId !== user.id) {
          console.log(`Creating friendship with jox: ${joxUserId} -> ${user.id}`);
          await storage.createFriendship(joxUserId, user.id);
        } else {
          // Fallback to admin if jox doesn't exist
          const adminUserId = await storage.getAdminUserId();
          if (adminUserId && adminUserId !== user.id) {
            console.log(`Creating friendship with admin (fallback): ${adminUserId} -> ${user.id}`);
            await storage.createFriendship(adminUserId, user.id);
          }
        }

        // 2. Auto-friend with inviter (if invitation was used)
        if (validation?.invitation?.invitedBy && validation.invitation.invitedBy !== user.id) {
          console.log(`Creating friendship with inviter: ${validation.invitation.invitedBy} -> ${user.id}`);
          await storage.createFriendship(validation.invitation.invitedBy, user.id);
          
          // 3. Create referral tracking for credits
          console.log(`Creating referral tracking: ${validation.invitation.invitedBy} -> ${user.id}`);
          await storage.createReferral(
            validation.invitation.invitedBy, 
            user.id, 
            validation.invitation.id
          );
          
          // 4. Award 20 ACP Credits to the inviter
          console.log(`Awarding 20 ACP Credits to inviter: ${validation.invitation.invitedBy}`);
          await storage.addUserCredits(validation.invitation.invitedBy, 20);
        } else {
          console.log(`No inviter to friend. validation:`, validation ? 'exists' : 'null', 
                     `invitedBy:`, validation?.invitation?.invitedBy);
        }
      } catch (friendshipError) {
        console.error("Error creating automatic friendships:", friendshipError);
        // Don't fail registration if friendship creation fails
      }

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/login", rateLimitMiddleware(loginLimiter), async (req, res, next) => {
    passport.authenticate("local", async (err: any, user: SelectUser | false, info: any) => {
      if (err) {
        return next(err);
      }
      
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      try {
        // Update last login IP and country
        const lastLoginIp = getClientIp(req);
        const lastLoginCountry = await getCountryFromIp(lastLoginIp);
        
        await storage.updateUser(user.id, {
          lastLoginIp,
          lastLoginCountry,
        });
        
        // Check if 2FA is enabled
        if (user.twoFactorEnabled) {
          // Check if device is trusted
          const trustedDeviceToken = req.cookies?.trusted_device;
          if (trustedDeviceToken) {
            const isTrusted = await verifyTrustedDevice(user.id, trustedDeviceToken);
            if (isTrusted) {
              // Skip 2FA for trusted device
              return req.login(user, (loginErr) => {
                if (loginErr) return next(loginErr);
                res.status(200).json(user);
              });
            }
          }
          
          // Create a short-lived challenge token for secure 2FA flow
          const challengeToken = await create2FAChallenge(user.id);
          
          // 2FA required - don't log in yet, send back challenge token (not userId)
          return res.status(200).json({
            requiresTwoFactor: true,
            challengeToken,
            twoFactorMethod: user.twoFactorMethod,
            phone: user.twoFactorPhone ? `***${user.twoFactorPhone.slice(-4)}` : null,
          });
        }
        
        // No 2FA - proceed with normal login
        req.login(user, (loginErr) => {
          if (loginErr) return next(loginErr);
          res.status(200).json(user);
        });
      } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ message: "Login failed" });
      }
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const claimed = await db.execute(
        sql`SELECT id FROM politician_profiles WHERE claimed_by_user_id = ${req.user.id} LIMIT 1`
      );
      const claimedPoliticianId = (claimed.rows as any[])[0]?.id || null;
      res.json({ ...req.user, claimedPoliticianId });
    } catch {
      res.json(req.user);
    }
  });

  app.post("/api/change-password", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }
      
      // Verify current password
      const user = await storage.getUser(req.user.id);
      if (!user || !(await comparePasswords(currentPassword, user.password))) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      
      // Hash new password and update
      const hashedNewPassword = await hashPassword(newPassword);
      await storage.updateUserPassword(req.user.id, hashedNewPassword);
      
      res.json({ message: "Password updated successfully" });
    } catch (error: any) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      // Check if user exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not for security
        return res.json({ message: "If an account with that email exists, a password reset link has been sent." });
      }
      
      // Generate secure reset token
      const resetToken = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      
      // Save token to database
      await storage.createPasswordResetToken(email, resetToken, expiresAt);
      
      const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`;

      try {
        await sendPasswordResetEmail(email, resetUrl);
      } catch (emailError: any) {
        console.error('[email] Failed to send password reset email:', emailError?.message || emailError);
      }

      res.json({ message: "If an account with that email exists, a password reset link has been sent." });
    } catch (error: any) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }
      
      if (newPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
      }
      
      // Find valid token
      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }
      
      // Get user by email
      const user = await storage.getUserByEmail(resetToken.email);
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }
      
      // Hash new password and update
      const hashedNewPassword = await hashPassword(newPassword);
      await storage.updateUserPassword(user.id, hashedNewPassword);
      
      // Mark token as used
      await storage.markTokenAsUsed(resetToken.id);
      
      // Clean up expired tokens
      await storage.cleanupExpiredTokens();
      
      res.json({ message: "Password has been reset successfully" });
    } catch (error: any) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Admin passphrase reset — bypasses email flow, only works for "admin" account
  app.post("/api/admin-passphrase-reset", async (req, res) => {
    try {
      const { passphrase } = req.body;

      if (!passphrase) {
        return res.status(400).json({ message: "Passphrase is required" });
      }

      const adminPassphrase = process.env.ADMIN_PASSPHRASE;
      if (!adminPassphrase) {
        return res.status(500).json({ message: "Admin passphrase not configured on this server" });
      }

      if (passphrase.trim() !== adminPassphrase) {
        return res.status(401).json({ message: "Incorrect passphrase" });
      }

      const adminUser = await storage.getUserByUsername("admin");
      if (!adminUser) {
        return res.status(404).json({ message: "Admin account not found" });
      }

      // Restore admin password back to the ADMIN_PASSPHRASE secret value
      const restoredPassword = await hashPassword(adminPassphrase);
      await storage.updateUserPassword(adminUser.id, restoredPassword);

      res.json({ message: "Admin password restored successfully" });
    } catch (error: any) {
      console.error("Admin passphrase reset error:", error);
      res.status(500).json({ message: "Failed to restore admin password" });
    }
  });

  // Invitation Management Routes

  // Create invitation (admin-only)
  app.post("/api/invitations", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    try {
      const { email, expiresAt, maxUses = 1 } = req.body;
      
      // Generate secure invitation token
      const invitationToken = randomBytes(32).toString('hex');
      
      const invitation = await storage.createInvitation({
        token: invitationToken,
        email: email || null,
        invitedBy: req.user.id,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        maxUses: maxUses,
      });
      
      // Return invitation with full URL
      const invitationUrl = `${req.protocol}://${req.get('host')}/register?invitation=${invitationToken}`;
      
      res.status(201).json({
        ...invitation,
        invitationUrl,
      });
    } catch (error: any) {
      console.error("Create invitation error:", error);
      res.status(500).json({ message: "Failed to create invitation" });
    }
  });

  // Get invitations (admin-only)
  app.get("/api/invitations", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    try {
      const invitations = await storage.getInvitationsByUser(req.user.id);
      res.json(invitations);
    } catch (error: any) {
      console.error("Get invitations error:", error);
      res.status(500).json({ message: "Failed to get invitations" });
    }
  });

  // Validate invitation (public route for checking invitation validity)
  app.get("/api/invitations/:token/validate", async (req, res) => {
    try {
      const { token } = req.params;
      const { email } = req.query as { email?: string };
      
      const validation = await storage.validateInvitation(token, email);
      res.json(validation);
    } catch (error: any) {
      console.error("Validate invitation error:", error);
      res.status(500).json({ message: "Failed to validate invitation" });
    }
  });

  // Delete invitation (admin-only)
  app.delete("/api/invitations/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    try {
      const { id } = req.params;
      await storage.deleteInvitation(id);
      res.json({ message: "Invitation deleted successfully" });
    } catch (error: any) {
      console.error("Delete invitation error:", error);
      res.status(500).json({ message: "Failed to delete invitation" });
    }
  });

  // ==================== Two-Factor Authentication Routes ====================

  // Setup TOTP (Google Authenticator)
  app.post("/api/2fa/totp/setup", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const result = await setupTotp(req.user.id, req.user.username);
      res.json(result);
    } catch (error: any) {
      console.error("TOTP setup error:", error);
      res.status(500).json({ message: "Failed to setup TOTP" });
    }
  });

  // Confirm TOTP setup
  app.post("/api/2fa/totp/confirm", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }
      
      const success = await confirmTotpSetup(req.user.id, token);
      if (success) {
        res.json({ message: "TOTP enabled successfully" });
      } else {
        res.status(400).json({ message: "Invalid token" });
      }
    } catch (error: any) {
      console.error("TOTP confirm error:", error);
      res.status(500).json({ message: "Failed to confirm TOTP" });
    }
  });

  // Verify TOTP during login (uses challenge token for security)
  app.post("/api/2fa/totp/verify", rateLimitMiddleware(twoFactorLimiter), async (req, res) => {
    try {
      const { challengeToken, token, rememberDevice } = req.body;
      
      if (!challengeToken || !token) {
        return res.status(400).json({ message: "challengeToken and token are required" });
      }
      
      // Verify the challenge token and get the userId
      const challenge = await verify2FAChallenge(challengeToken);
      if (!challenge.valid || !challenge.userId) {
        return res.status(400).json({ message: "Invalid or expired challenge. Please log in again." });
      }
      
      const userId = challenge.userId;
      
      const verified = await verifyTotp(userId, token);
      if (!verified) {
        return res.status(400).json({ message: "Invalid token" });
      }
      
      // Delete the used challenge token
      await delete2FAChallenge(challengeToken);
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Create trusted device if requested
      if (rememberDevice) {
        const deviceToken = await createTrustedDevice(
          userId, 
          req.headers['user-agent'] || 'Unknown',
          getClientIp(req)
        );
        res.cookie('trusted_device', deviceToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 60 * 24 * 60 * 60 * 1000,
          sameSite: 'lax'
        });
      }
      
      // Log the user in
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed" });
        }
        res.json(user);
      });
    } catch (error: any) {
      console.error("TOTP verify error:", error);
      res.status(500).json({ message: "Failed to verify TOTP" });
    }
  });

  // Disable TOTP
  app.post("/api/2fa/totp/disable", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      await disableTotp(req.user.id);
      res.json({ message: "TOTP disabled successfully" });
    } catch (error: any) {
      console.error("TOTP disable error:", error);
      res.status(500).json({ message: "Failed to disable TOTP" });
    }
  });

  // Send SMS OTP (uses challenge token for login flow, or auth for settings)
  app.post("/api/2fa/sms/send", async (req, res) => {
    try {
      const { challengeToken, phoneNumber } = req.body;
      
      let targetUserId: string | undefined;
      let targetPhone: string | undefined;
      
      // For login flow: use challenge token
      if (challengeToken) {
        const challenge = await verify2FAChallenge(challengeToken);
        if (!challenge.valid || !challenge.userId) {
          return res.status(400).json({ message: "Invalid or expired challenge. Please log in again." });
        }
        targetUserId = challenge.userId;
        const user = await storage.getUser(targetUserId);
        targetPhone = user?.twoFactorPhone || undefined;
      } 
      // For settings: use authenticated user
      else if (req.isAuthenticated()) {
        targetUserId = req.user.id;
        targetPhone = phoneNumber || req.user.twoFactorPhone || undefined;
      } else {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      if (!targetUserId) {
        return res.status(400).json({ message: "User ID could not be determined" });
      }
      
      if (!targetPhone) {
        return res.status(400).json({ message: "Phone number is required" });
      }
      
      const sent = await sendSms2FA(targetUserId, targetPhone);
      if (sent) {
        res.json({ message: "OTP sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send OTP" });
      }
    } catch (error: any) {
      console.error("SMS send error:", error);
      res.status(500).json({ message: "Failed to send OTP" });
    }
  });

  // Verify SMS OTP during login (uses challenge token for security)
  app.post("/api/2fa/sms/verify", rateLimitMiddleware(twoFactorLimiter), async (req, res) => {
    try {
      const { challengeToken, code, rememberDevice } = req.body;
      
      if (!challengeToken || !code) {
        return res.status(400).json({ message: "challengeToken and code are required" });
      }
      
      // Verify the challenge token and get the userId
      const challenge = await verify2FAChallenge(challengeToken);
      if (!challenge.valid || !challenge.userId) {
        return res.status(400).json({ message: "Invalid or expired challenge. Please log in again." });
      }
      
      const userId = challenge.userId;
      
      const result = await verifySms2FA(userId, code);
      if (!result.success) {
        return res.status(400).json({ message: result.reason || "Invalid code" });
      }
      
      // Delete the used challenge token
      await delete2FAChallenge(challengeToken);
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Create trusted device if requested
      if (rememberDevice) {
        const deviceToken = await createTrustedDevice(
          userId, 
          req.headers['user-agent'] || 'Unknown',
          getClientIp(req)
        );
        res.cookie('trusted_device', deviceToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 60 * 24 * 60 * 60 * 1000,
          sameSite: 'lax'
        });
      }
      
      // Log the user in
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed" });
        }
        res.json(user);
      });
    } catch (error: any) {
      console.error("SMS verify error:", error);
      res.status(500).json({ message: "Failed to verify OTP" });
    }
  });

  // Enable SMS 2FA
  app.post("/api/2fa/sms/enable", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { phoneNumber, code } = req.body;
      
      if (!phoneNumber || !code) {
        return res.status(400).json({ message: "Phone number and verification code are required" });
      }
      
      // Verify the code first
      const result = await verifySms2FA(req.user.id, code);
      if (!result.success) {
        return res.status(400).json({ message: result.reason || "Invalid code" });
      }
      
      await enableSms2FA(req.user.id, phoneNumber);
      res.json({ message: "SMS 2FA enabled successfully" });
    } catch (error: any) {
      console.error("SMS enable error:", error);
      res.status(500).json({ message: "Failed to enable SMS 2FA" });
    }
  });

  // Disable SMS 2FA
  app.post("/api/2fa/sms/disable", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      await disableSms2FA(req.user.id);
      res.json({ message: "SMS 2FA disabled successfully" });
    } catch (error: any) {
      console.error("SMS disable error:", error);
      res.status(500).json({ message: "Failed to disable SMS 2FA" });
    }
  });

  // Get 2FA status
  app.get("/api/2fa/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({
        twoFactorEnabled: user.twoFactorEnabled || false,
        twoFactorMethod: user.twoFactorMethod || null,
        totpEnabled: user.totpEnabled || false,
        smsEnabled: user.smsEnabled || false,
        phone: user.twoFactorPhone ? `***${user.twoFactorPhone.slice(-4)}` : null,
      });
    } catch (error: any) {
      console.error("2FA status error:", error);
      res.status(500).json({ message: "Failed to get 2FA status" });
    }
  });

  // Get trusted devices
  app.get("/api/2fa/devices", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const devices = await storage.getTrustedDevices(req.user.id);
      res.json(devices);
    } catch (error: any) {
      console.error("Get devices error:", error);
      res.status(500).json({ message: "Failed to get devices" });
    }
  });

  // Remove trusted device
  app.delete("/api/2fa/devices/:deviceId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { deviceId } = req.params;
      await storage.removeTrustedDevice(req.user.id, deviceId);
      res.json({ message: "Device removed successfully" });
    } catch (error: any) {
      console.error("Remove device error:", error);
      res.status(500).json({ message: "Failed to remove device" });
    }
  });

  // Check if device is trusted (used during login)
  app.post("/api/2fa/check-device", async (req, res) => {
    try {
      const { userId } = req.body;
      const trustedDeviceToken = req.cookies?.trusted_device;
      
      if (!userId || !trustedDeviceToken) {
        return res.json({ trusted: false });
      }
      
      const isTrusted = await verifyTrustedDevice(userId, trustedDeviceToken);
      res.json({ trusted: isTrusted });
    } catch (error: any) {
      console.error("Check device error:", error);
      res.json({ trusted: false });
    }
  });
}
