---
name: email-templates
description: Transactional email reference - React Email templates in ./emails, the Resend SDK integration in lib/email, the local preview server, and export. Load when adding or editing an email template or sending mail.
---

# Email (React Email + Resend)

## Commands

```bash
bun run email:dev     # Preview templates at http://localhost:3001
bun run email:export  # Export rendered templates to .react-email
bun run dev:email     # Run the app and the email preview server together
```

## Layout

- `./emails` — React Email templates (`base-layout.tsx`, `otp.tsx`, `welcome.tsx`, `invitation.tsx`). New templates go here and should compose `base-layout.tsx`.
- `./lib/email` — Resend client, send helpers, and template wiring.

## Rules

- **Templates**: Create email templates in `./lib/email`
- **Transactional**: Welcome emails, billing notifications
- **Configuration**: Use environment variables for branding
- **Error Handling**: Proper fallbacks for email delivery

- **SDK only**: send through the official `resend` SDK, never a raw `fetch` to `api.resend.com`.
- **Branding**: pull sender name, address, and logo from environment variables rather than hardcoding them.
- **Config**: when you add or change an email-related environment variable, record it in `kosuke.config.json` under `environment` for both `preview` and `production`.

```typescript
// ✅ CORRECT - official SDK
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
await resend.emails.send({
  /* ... */
});

// ❌ WRONG - raw HTTP request when an SDK exists
await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
  body: JSON.stringify({
    /* ... */
  }),
});
```

## Auth emails

Authentication is Email OTP (no passwords), so the OTP template is on the critical path — verify `emails/otp.tsx` still renders after any change to `base-layout.tsx`.
