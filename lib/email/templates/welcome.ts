import { EmailTemplate } from '../index';

export interface WelcomeEmailData {
  firstName: string;
  email: string;
  dashboardUrl?: string;
  settingsUrl?: string;
}

export function createWelcomeEmail(data: WelcomeEmailData): EmailTemplate {
  const { firstName, email, dashboardUrl, settingsUrl } = data;

  const subject = `Welcome to Kosuke Template, ${firstName}! 🎉`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Kosuke Template</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f8fafc;
    }
    .container {
      background-color: #ffffff;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    .logo {
      font-size: 32px;
      font-weight: 800;
      color: #1e40af;
      margin-bottom: 8px;
    }
    .tagline {
      color: #64748b;
      font-size: 16px;
    }
    .welcome-message {
      margin-bottom: 32px;
    }
    .welcome-title {
      font-size: 28px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 16px;
    }
    .welcome-text {
      font-size: 16px;
      color: #475569;
      margin-bottom: 16px;
    }
    .cta-section {
      background-color: #f1f5f9;
      border-radius: 8px;
      padding: 24px;
      margin: 32px 0;
      text-align: center;
    }
    .cta-button {
      display: inline-block;
      background-color: #3b82f6;
      color: #ffffff;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      margin: 8px;
      transition: background-color 0.2s;
    }
    .cta-button:hover {
      background-color: #2563eb;
    }
    .cta-button.secondary {
      background-color: #64748b;
    }
    .cta-button.secondary:hover {
      background-color: #475569;
    }
    .features {
      margin: 32px 0;
    }
    .feature-list {
      list-style: none;
      padding: 0;
    }
    .feature-item {
      display: flex;
      align-items: center;
      margin-bottom: 12px;
      font-size: 14px;
      color: #475569;
    }
    .feature-icon {
      color: #10b981;
      margin-right: 12px;
      font-weight: bold;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 24px;
      border-top: 1px solid #e2e8f0;
      color: #64748b;
      font-size: 14px;
    }
    .footer-links {
      margin: 16px 0;
    }
    .footer-link {
      color: #3b82f6;
      text-decoration: none;
      margin: 0 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Kosuke Template</div>
      <div class="tagline">Modern Next.js Template</div>
    </div>
    
    <div class="welcome-message">
      <h1 class="welcome-title">Welcome, ${firstName}! 🎉</h1>
      <p class="welcome-text">
        Thank you for joining Kosuke Template! We're excited to have you on board.
        Your account (<strong>${email}</strong>) has been successfully created.
      </p>
      <p class="welcome-text">
        You now have access to a powerful Next.js template with authentication, 
        billing, beautiful UI components, and much more.
      </p>
    </div>

    <div class="cta-section">
      <h3 style="margin-top: 0; color: #1e293b;">Get Started</h3>
      ${dashboardUrl ? `<a href="${dashboardUrl}" class="cta-button">Go to Dashboard</a>` : ''}
      ${settingsUrl ? `<a href="${settingsUrl}" class="cta-button secondary">Account Settings</a>` : ''}
    </div>

    <div class="features">
      <h3 style="color: #1e293b; margin-bottom: 16px;">What's included:</h3>
      <ul class="feature-list">
        <li class="feature-item">
          <span class="feature-icon">✓</span>
          Next.js 15 with App Router and TypeScript
        </li>
        <li class="feature-item">
          <span class="feature-icon">✓</span>
          Clerk Authentication with user management
        </li>
        <li class="feature-item">
          <span class="feature-icon">✓</span>
          Polar Billing integration for subscriptions
        </li>
        <li class="feature-item">
          <span class="feature-icon">✓</span>
          Beautiful Shadcn UI components
        </li>
        <li class="feature-item">
          <span class="feature-icon">✓</span>
          PostgreSQL database with Drizzle ORM
        </li>
        <li class="feature-item">
          <span class="feature-icon">✓</span>
          Dark/Light mode support
        </li>
        <li class="feature-item">
          <span class="feature-icon">✓</span>
          File uploads with Vercel Blob
        </li>
        <li class="feature-item">
          <span class="feature-icon">✓</span>
          Error monitoring with Sentry
        </li>
      </ul>
    </div>

    <div class="footer">
      <p>Need help getting started? We're here to help!</p>
      <div class="footer-links">
        <a href="#" class="footer-link">Documentation</a>
        <a href="#" class="footer-link">Support</a>
        <a href="#" class="footer-link">Community</a>
      </div>
      <p style="margin-top: 24px; font-size: 12px;">
        This email was sent to ${email}. If you have any questions, 
        just reply to this email—we're always happy to help out.
      </p>
    </div>
  </div>
</body>
</html>`;

  const text = `
Welcome to Kosuke Template, ${firstName}! 🎉

Thank you for joining Kosuke Template! We're excited to have you on board.
Your account (${email}) has been successfully created.

You now have access to a powerful Next.js template with authentication, 
billing, beautiful UI components, and much more.

What's included:
• Next.js 15 with App Router and TypeScript
• Clerk Authentication with user management
• Polar Billing integration for subscriptions
• Beautiful Shadcn UI components
• PostgreSQL database with Drizzle ORM
• Dark/Light mode support
• File uploads with Vercel Blob
• Error monitoring with Sentry

Get Started:
${dashboardUrl ? `Dashboard: ${dashboardUrl}` : ''}
${settingsUrl ? `Settings: ${settingsUrl}` : ''}

Need help getting started? We're here to help!
Just reply to this email—we're always happy to help out.

---
This email was sent to ${email}.
  `.trim();

  return {
    subject,
    html,
    text,
  };
}
