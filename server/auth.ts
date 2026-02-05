import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { getClientIp, getCountryFromIp } from "./ip-utils";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await storage.getUserByUsername(username);
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

  app.post("/api/register", async (req, res, next) => {
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

  app.post("/api/login", passport.authenticate("local"), async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication failed" });
    }
    
    try {
      // Update last login IP and country
      const lastLoginIp = getClientIp(req);
      const lastLoginCountry = await getCountryFromIp(lastLoginIp);
      
      await storage.updateUser(req.user.id, {
        lastLoginIp,
        lastLoginCountry,
      });
      
      res.status(200).json(req.user);
    } catch (error) {
      console.error("Error updating login IP:", error);
      // Still send user data even if IP update fails
      res.status(200).json(req.user);
    }
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
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
      
      // In a real app, you would send an email here
      // For now, we'll just log it to the console
      const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`;
      console.log(`Password reset link for ${email}: ${resetUrl}`);
      
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
      
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
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
}
