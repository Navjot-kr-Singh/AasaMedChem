import nodemailer from 'nodemailer';

/**
 * Sends a verification approval email to the seller when their profile is verified.
 */
export async function sendVerificationEmail(toEmail: string, businessName: string): Promise<{ success: boolean; messageId?: string; error?: any }> {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || 'no-reply@aasamedchem.com';

  if (!host || !user || !pass) {
    console.warn("SMTP credentials are not fully configured. Email was not sent. Required env variables: SMTP_HOST, SMTP_USER, SMTP_PASS");
    return { success: false, error: "SMTP credentials not configured" };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for port 465, false for other ports (like 587)
    auth: {
      user,
      pass,
    },
    // Add connection timeout safeguards
    connectionTimeout: 5000,
    greetingTimeout: 5000,
  });

  const loginUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/login`;

  const mailOptions = {
    from: `"AasaMedChem Compliance" <${from}>`,
    to: toEmail,
    subject: `Account Verified - AasaMedChem Seller Portal`,
    text: `Hello,\n\nWe are pleased to inform you that your seller account for "${businessName}" has been successfully verified by our compliance team.\n\nYou can now log in to the dashboard, list your pharmaceutical products, and start selling.\n\nLogin here: ${loginUrl}\n\nBest regards,\nAasaMedChem Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #4f46e5; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">AasaMedChem</h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Compliance & Seller Onboarding</p>
        </div>
        <div style="border-top: 4px solid #4f46e5; padding-top: 24px;">
          <h3 style="color: #0f172a; margin-top: 0; font-size: 18px;">Account Successfully Verified!</h3>
          <p style="color: #334155; line-height: 1.6; font-size: 15px;">Hello,</p>
          <p style="color: #334155; line-height: 1.6; font-size: 15px;">
            We are pleased to inform you that your seller onboarding application for <strong>${businessName}</strong> has been successfully reviewed and approved by our administrative compliance team.
          </p>
          <p style="color: #334155; line-height: 1.6; font-size: 15px;">
            Your account is now active. You have full workspace access and can begin cataloging chemical substances, setting up unit prices, and receiving orders.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${loginUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">
              Access Seller Dashboard
            </a>
          </div>
          <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin-top: 24px;">
            If you did not apply for this account or have questions, please contact our support team.
          </p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
            Best regards,<br /><strong>AasaMedChem Compliance Team</strong>
          </p>
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Seller verification email sent successfully:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Failed to send seller verification email:", error);
    return { success: false, error };
  }
}
