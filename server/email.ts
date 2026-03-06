import sgMail from '@sendgrid/mail';

const FROM_EMAIL = 'noreply@anticorruptionparty.us';
const FROM_NAME = 'Anti-Corruption Party';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn('[email] SENDGRID_API_KEY is not set — emails will not be sent');
}

export async function sendPasswordResetEmail(toEmail: string, resetUrl: string): Promise<void> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn(`[email] Skipping send — no API key. Reset URL: ${resetUrl}`);
    return;
  }

  const msg = {
    to: toEmail,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: 'Reset your password — Anti-Corruption Party',
    text: `You requested a password reset. Click the link below to set a new password. This link expires in 1 hour.\n\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
            <tr>
              <td align="center">
                <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                  <tr>
                    <td style="background:#1a3a5c;padding:28px 40px;text-align:center;">
                      <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.5px;">
                        Anti-Corruption Party
                      </h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:40px;">
                      <h2 style="margin:0 0 16px;color:#1a1a1a;font-size:22px;">Reset your password</h2>
                      <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">
                        We received a request to reset the password for your account. Click the button below to choose a new password. This link will expire in <strong>1 hour</strong>.
                      </p>
                      <div style="text-align:center;margin:32px 0;">
                        <a href="${resetUrl}"
                           style="display:inline-block;background:#1a3a5c;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:6px;">
                          Reset Password
                        </a>
                      </div>
                      <p style="margin:24px 0 0;color:#888;font-size:13px;line-height:1.6;">
                        If you didn't request a password reset, you can safely ignore this email — your password will not change.
                      </p>
                      <hr style="border:none;border-top:1px solid #eee;margin:32px 0;" />
                      <p style="margin:0;color:#aaa;font-size:12px;">
                        If the button above doesn't work, copy and paste this link into your browser:<br/>
                        <a href="${resetUrl}" style="color:#1a3a5c;word-break:break-all;">${resetUrl}</a>
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background:#f9f9f9;padding:20px 40px;text-align:center;">
                      <p style="margin:0;color:#aaa;font-size:12px;">
                        &copy; ${new Date().getFullYear()} Anti-Corruption Party &bull; noreply@anticorruptionparty.us
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  };

  await sgMail.send(msg);
}

export async function sendClaimVerificationEmail(toEmail: string, politicianName: string, verifyUrl: string): Promise<void> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn(`[email] Skipping claim email — no API key. Verify URL: ${verifyUrl}`);
    return;
  }

  const msg = {
    to: toEmail,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: `Verify your profile claim — ${politicianName}`,
    text: `Someone requested to claim the profile page for ${politicianName} on the Anti-Corruption Party platform.\n\nIf this was you, click the link below to verify your email and activate your profile. This link expires in 72 hours.\n\n${verifyUrl}\n\nIf you did not request this, you can safely ignore this email.`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
            <tr>
              <td align="center">
                <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                  <tr>
                    <td style="background:#1a3a5c;padding:28px 40px;text-align:center;">
                      <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.5px;">
                        Anti-Corruption Party
                      </h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:40px;">
                      <h2 style="margin:0 0 16px;color:#1a1a1a;font-size:22px;">Verify your profile claim</h2>
                      <p style="margin:0 0 16px;color:#555;font-size:15px;line-height:1.6;">
                        Someone requested to claim the profile page for <strong>${politicianName}</strong> on the Anti-Corruption Party platform.
                      </p>
                      <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">
                        If this was you, click the button below to verify your email address and activate your profile. This link expires in <strong>72 hours</strong>.
                      </p>
                      <div style="text-align:center;margin:32px 0;">
                        <a href="${verifyUrl}"
                           style="display:inline-block;background:#1a3a5c;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:6px;">
                          Verify &amp; Claim My Profile
                        </a>
                      </div>
                      <p style="margin:24px 0 0;color:#888;font-size:13px;line-height:1.6;">
                        If you did not request this, you can safely ignore this email — no changes will be made.
                      </p>
                      <hr style="border:none;border-top:1px solid #eee;margin:32px 0;" />
                      <p style="margin:0;color:#aaa;font-size:12px;">
                        If the button above doesn't work, copy and paste this link into your browser:<br/>
                        <a href="${verifyUrl}" style="color:#1a3a5c;word-break:break-all;">${verifyUrl}</a>
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background:#f9f9f9;padding:20px 40px;text-align:center;">
                      <p style="margin:0;color:#aaa;font-size:12px;">
                        &copy; ${new Date().getFullYear()} Anti-Corruption Party &bull; noreply@anticorruptionparty.us
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  };

  await sgMail.send(msg);
}
