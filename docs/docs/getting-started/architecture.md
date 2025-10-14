---
sidebar_position: 1
---

# Architecture

Kosuke Template is built with a carefully selected modern tech stack optimized for building production-ready SaaS applications.

## Core Framework

### Next.js 15 (App Router)

- **Server Components** for optimal performance
- **Server Actions** for mutations
- **Streaming** for faster page loads
- **Middleware** for request-level logic
- **API Routes** for backend endpoints

### React 19

- Latest React features
- Improved Server Components
- Enhanced suspense
- Better error handling

### TypeScript

- Full type safety across the stack
- Improved developer experience
- Better IDE support
- Catch errors at compile time

## Styling

### Tailwind CSS

- Utility-first CSS framework
- Highly customizable
- Dark mode support built-in
- Responsive design utilities

### Shadcn UI

- High-quality React components
- Built on Radix UI primitives
- Accessible by default
- Customizable with Tailwind

## Authentication

### Clerk

- Complete authentication solution
- **Organizations & Teams** support
- Social login providers
- Beautiful pre-built UI components
- Webhook integration for data sync

**Why Clerk?**

- Best-in-class Organizations feature for multi-tenancy
- Excellent developer experience
- Comprehensive documentation
- Free tier includes 10,000 monthly active users

## Database

### PostgreSQL

- Reliable relational database
- ACID compliant
- Rich feature set
- Wide ecosystem support

### Neon

- Serverless PostgreSQL
- Automatic preview branches for pull requests
- Built-in connection pooling
- Generous free tier (3 GB storage)

### Drizzle ORM

- Type-safe database queries
- SQL-like syntax
- Excellent migration system
- Zero dependencies, lightweight

**Why Drizzle?**

- Better TypeScript integration than Prisma
- More control over SQL
- Lighter weight
- Excellent performance

## Billing

### Polar

- Modern billing platform built for developers
- Subscription management
- Webhook events for real-time updates
- Sandbox environment for testing
- Developer-friendly API

**Why Polar?**

- Built specifically for developers
- Simple, transparent pricing
- Excellent documentation
- Full sandbox testing environment

## Storage

### Vercel Blob

- File storage optimized for Next.js apps
- Built-in CDN for fast delivery
- Automatic image optimization
- Simple, intuitive API

**Use Cases:**

- User profile images
- Organization logos
- Document attachments
- General asset storage

## Email

### Resend

- Modern email API with high deliverability
- Simple integration
- Generous free tier (3,000 emails/month)
- Built for transactional emails

### React Email

- Build email templates with React components
- Component reusability
- Preview in development
- TypeScript support for type-safe props

**Why React Email?**

- Write emails like React components
- Reuse UI components
- Type-safe template props
- Live preview server for development

## Monitoring

### Sentry

- Comprehensive error tracking
- Performance monitoring
- Session replay for debugging
- Release tracking
- Automatic source map upload

**What's Monitored:**

- Client-side JavaScript errors
- Server-side errors
- API endpoint performance
- Database query times
- User sessions with replay

## Testing

### Vitest

- Fast unit test runner
- Jest-compatible API
- Native ESM support
- Excellent TypeScript support

### React Testing Library

- Test React components behavior
- Encourage accessibility best practices
- Intuitive query APIs

## Code Quality

### ESLint

- Catch errors early in development
- Enforce consistent code style
- Next.js specific rules
- TypeScript integration

### Prettier

- Automatic code formatting
- Integrates with ESLint
- Consistent style across team

## Development Tools

### Docker Compose

- Local PostgreSQL database
- Consistent development environment
- Easy setup and teardown

### Drizzle Studio

- Visual database browser
- Edit records directly
- Run custom queries
- View table relationships

### React Email Preview

- Live email template preview
- Test with different props
- Responsive design testing

## Deployment

### Vercel

- Optimal hosting for Next.js applications
- Automatic deployments on git push
- Preview deployments for every PR
- Global edge network
- Built-in analytics

### Vercel Cron

- Scheduled jobs (subscription sync every 6 hours)
- No additional infrastructure needed
- Secure with authorization tokens

## Why This Stack?

### Type Safety

Every layer is type-safe:

- TypeScript for application code
- Drizzle for database operations
- Zod for runtime validation
- tRPC for end-to-end type safety (optional)

### Developer Experience

- Fast iteration cycles with hot reload
- Excellent tooling and IDE support
- Comprehensive documentation for all services
- Active, helpful communities

### Performance

- Server Components minimize JavaScript bundle
- Edge middleware for lightning-fast responses
- CDN for static assets worldwide
- Optimized database queries with connection pooling

### Scalability

- Serverless architecture scales automatically
- Database connection pooling
- Edge deployment for global reach
- Automatic preview environments

### Cost-Effective

All services offer generous free tiers perfect for getting started:

- **Vercel**: Free for personal projects, unlimited deployments
- **Neon**: 3 GB storage, unlimited database branches
- **Clerk**: 10,000 monthly active users
- **Resend**: 3,000 emails per month
- **Sentry**: 5,000 error events per month
- **Polar**: Free sandbox mode for testing

### Production-Ready

- Error monitoring from day one
- Automated testing setup
- Database migrations system
- Security best practices built-in
- Comprehensive logging

## Alternative Choices

If you prefer different technologies:

**Database Providers:**

- Supabase (PostgreSQL alternative to Neon)
- PlanetScale (MySQL)
- Railway (simple PostgreSQL hosting)

**Authentication:**

- Auth.js (open-source, more DIY)
- Supabase Auth (if using Supabase)
- Firebase Auth (Google ecosystem)

**ORM:**

- Prisma (more popular, different approach)
- Kysely (more SQL-focused)
- TypeORM (traditional ORM pattern)

**Billing:**

- Stripe (most established, more complex)
- Paddle (merchant of record model)
- LemonSqueezy (simpler setup)

The selected stack represents the best balance of developer experience, performance, type safety, and cost-effectiveness for SaaS applications.
