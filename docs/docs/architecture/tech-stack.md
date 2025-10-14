---
sidebar_position: 1
---

# Tech Stack

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

- Best-in-class Organizations feature
- Excellent developer experience
- Comprehensive documentation
- Free tier includes 10,000 MAUs

## Database

### PostgreSQL

- Reliable relational database
- ACID compliant
- Rich feature set
- Wide ecosystem support

### Neon

- Serverless PostgreSQL
- Automatic preview branches
- Built-in connection pooling
- Generous free tier

### Drizzle ORM

- Type-safe database queries
- SQL-like syntax
- Great migration system
- Zero dependencies

**Why Drizzle?**

- Better TypeScript integration than Prisma
- More control over SQL
- Lighter weight
- Excellent performance

## Billing

### Polar

- Modern billing platform
- Subscription management
- Webhook events
- Sandbox environment
- Developer-friendly API

**Why Polar?**

- Built for developers
- Simple pricing
- Excellent documentation
- Sandbox testing

## Storage

### Vercel Blob

- File storage for Next.js apps
- Built-in CDN
- Automatic optimization
- Simple API

**Use cases:**

- Profile images
- Document uploads
- Asset storage

## Email

### Resend

- Modern email API
- High deliverability
- Simple integration
- Generous free tier

### React Email

- Build emails with React
- Component-based templates
- Preview in development
- TypeScript support

**Why React Email?**

- Write emails like React components
- Reuse components
- Type-safe props
- Live preview server

## Monitoring

### Sentry

- Error tracking
- Performance monitoring
- Session replay
- Release tracking

**What's monitored:**

- Client-side errors
- Server-side errors
- API performance
- Database queries
- User sessions

## Testing

### Vitest

- Fast unit test runner
- Jest-compatible API
- Native ESM support
- TypeScript support

### React Testing Library

- Test React components
- Encourage best practices
- Accessible queries

## Code Quality

### ESLint

- Catch errors early
- Enforce code style
- Next.js specific rules
- TypeScript integration

### TypeScript

- Static type checking
- Better refactoring
- Documentation through types

### Prettier

- Consistent code formatting
- Integrates with ESLint
- Auto-format on save

## Development Tools

### Docker Compose

- Local PostgreSQL database
- Consistent dev environment
- Easy setup

### Drizzle Studio

- Visual database browser
- Edit records
- Run queries
- View relationships

### React Email Preview

- Live email template preview
- Test with different props
- Responsive testing

## Deployment

### Vercel

- Optimal for Next.js apps
- Automatic deployments
- Preview deployments
- Edge network
- Built-in analytics

### Vercel Cron

- Scheduled jobs
- Subscription synchronization
- No additional infrastructure needed

## Why This Stack?

### Type Safety

Every layer is type-safe:

- TypeScript for code
- Drizzle for database
- Zod for validation
- tRPC for API calls (optional)

### Developer Experience

- Fast iteration cycles
- Excellent tooling
- Great documentation
- Active communities

### Performance

- Server Components reduce JS bundle
- Edge middleware for fast responses
- CDN for static assets
- Optimized database queries

### Scalability

- Serverless architecture
- Connection pooling
- Edge deployment
- Automatic preview environments

### Cost-Effective

All services have generous free tiers:

- Vercel: Free for personal projects
- Neon: 3 GB storage free
- Clerk: 10,000 MAUs free
- Resend: 3,000 emails/month free
- Sentry: 5,000 events/month free
- Polar: Free in sandbox

## Alternative Choices

### Database

- **Supabase**: Good alternative to Neon
- **PlanetScale**: If you need MySQL
- **Railway**: Simple PostgreSQL hosting

### Authentication

- **Auth.js**: Open-source alternative
- **Supabase Auth**: If using Supabase
- **Firebase Auth**: Google ecosystem

### ORM

- **Prisma**: More popular, different approach
- **Kysely**: More SQL-focused
- **TypeORM**: Traditional ORM

### Billing

- **Stripe**: More established, more complex
- **Paddle**: Merchant of record
- **LemonSqueezy**: Simple setup

## Migration Path

### From Other Stacks

#### From Prisma

1. Export schema to SQL
2. Convert to Drizzle schema
3. Generate migrations
4. Test thoroughly

#### From Auth.js to Clerk

1. Export user data
2. Import to Clerk
3. Update authentication code
4. Test sign-in flows

#### From Stripe to Polar

1. Export customer data
2. Recreate products in Polar
3. Migrate active subscriptions
4. Update webhook handlers

## Next Steps

Learn about the project structure:

👉 **[Project Structure](./project-structure)**

---

**Questions?** Check the [Reference](../reference/commands) section or open an issue.
