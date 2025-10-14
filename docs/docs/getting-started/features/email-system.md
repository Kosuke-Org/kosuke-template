---
sidebar_position: 3
---

# Email System

Transactional emails with React Email and Resend.

## Overview

Kosuke Template includes a complete email system:

- React Email templates
- Resend delivery
- Welcome emails on signup
- Customizable templates

## Templates

### Welcome Email

Sent automatically when users sign up. The email is built using React components and delivered through Resend's infrastructure for high deliverability.

### Creating Templates

Email templates are React components stored in the `/emails` directory. They use React Email's component library for consistent, responsive email layouts that work across all email clients.

## Development

Email templates can be previewed locally using React Email's development server. This allows you to test templates with different props and see exactly how they'll appear to recipients.

## Sending Emails

The email system provides a simple interface for sending transactional emails. Templates are rendered to HTML on the server and delivered through Resend's API.

## Best Practices

1. **Test templates** in preview before deploying
2. **Verify domain** for production
3. **Handle failures** gracefully (non-blocking)
4. **Include plain text** versions
5. **Monitor deliverability** in Resend dashboard

## Next Steps

Learn about subscription synchronization:

👉 **[Subscription Synchronization](./subscription-sync)**
