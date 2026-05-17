import nodemailer, { Transporter } from 'nodemailer';

// Configure email transporter
export const emailTransporter: Transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.example.com',
  port: parseInt(process.env.EMAIL_PORT || '587', 10),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Email configuration
export const emailConfig = {
  from: process.env.EMAIL_FROM || 'Room Booking System <noreply@example.com>',
  replyTo: process.env.EMAIL_REPLY_TO,
};

// Send email helper function
export async function sendEmail(options: {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}): Promise<boolean> {
  try {
    await emailTransporter.sendMail({
      from: emailConfig.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
}

// Verify email configuration on startup
export async function verifyEmailConfig(): Promise<void> {
  try {
    await emailTransporter.verify();
    console.log('✓ Email configuration verified');
  } catch (error) {
    console.warn('⚠ Email configuration not verified:', error);
  }
}
