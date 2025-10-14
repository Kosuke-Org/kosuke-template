# Kosuke Template

Production-ready Next.js 15 SaaS starter with Clerk Organizations, Polar Billing, and complete multi-tenant functionality.

## 📚 Documentation

**Complete setup guide, architecture, and features documentation:**

👉 **[docs-template.kosuke.ai](https://docs-template.kosuke.ai)**

## 🚀 Quick Links

- [Getting Started](https://docs-template.kosuke.ai/category/getting-started) - Complete setup guide
- [Architecture](https://docs-template.kosuke.ai/category/architecture) - Tech stack and structure
- [Features](https://docs-template.kosuke.ai/category/features) - Organizations, billing, email
- [Deployment](https://docs-template.kosuke.ai/category/deployment) - Deploy to production
- [Reference](https://docs-template.kosuke.ai/category/reference) - Commands and troubleshooting

## 🛠 Tech Stack

- **Framework**: Next.js 15 (App Router) + React 19 + TypeScript
- **Auth**: Clerk (with Organizations)
- **Database**: PostgreSQL (Neon) + Drizzle ORM
- **Billing**: Polar subscriptions
- **Email**: Resend + React Email
- **Storage**: Vercel Blob
- **Monitoring**: Sentry
- **UI**: Tailwind CSS + Shadcn UI

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/kosuke-template.git`
3. Install dependencies: `pnpm install`
4. Set up environment: Copy `.env.example` to `.env` and configure
5. Start database: `docker-compose up -d postgres`
6. Run migrations: `pnpm run db:migrate`
7. Start dev server: `pnpm run dev`

### Development Workflow

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Run tests: `pnpm test`
4. Run linting: `pnpm run lint`
5. Check types: `pnpm run typecheck`
6. Commit your changes: `git commit -m "feat: add amazing feature"`
7. Push to your fork: `git push origin feature/your-feature-name`
8. Open a Pull Request

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Test additions or changes
- `chore:` Maintenance tasks

### Code Style

- Use TypeScript for all new code
- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Ensure all checks pass before submitting PR

### Pull Request Process

1. Update documentation if needed
2. Add tests for new functionality
3. Ensure all CI checks pass
4. Request review from maintainers
5. Address review feedback
6. Squash commits before merge (if requested)

### Development Guidelines

- **Type Safety**: Maintain strict TypeScript types
- **Testing**: Add tests for new features and bug fixes
- **Documentation**: Update docs for API changes
- **Performance**: Consider performance implications
- **Accessibility**: Ensure UI changes are accessible
- **Security**: Follow security best practices

### Project Structure

- `/app` - Next.js App Router pages and API routes
- `/components` - Reusable React components
- `/lib` - Utilities, database, auth, billing logic
- `/hooks` - Custom React hooks
- `/emails` - React Email templates
- `/docs` - Docusaurus documentation site

### Running Tests

```bash
# Run all tests
pnpm test

# Watch mode
pnpm run test:watch

# Coverage report
pnpm run test:coverage
```

### Database Changes

When modifying the database schema:

```bash
# 1. Edit lib/db/schema.ts
# 2. Generate migration
pnpm run db:generate

# 3. Apply migration
pnpm run db:migrate
```

### Documentation

Update documentation in the `/docs` directory:

```bash
cd docs
pnpm install
pnpm start
```

### Reporting Issues

When reporting issues, please include:

- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, etc.)
- Error messages or logs
- Screenshots if applicable

### Feature Requests

We welcome feature requests! Please:

- Check existing issues first
- Describe the feature clearly
- Explain the use case
- Consider implementation complexity
- Be open to discussion

## 📝 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

Built with:

- [Next.js](https://nextjs.org)
- [Clerk](https://clerk.com)
- [Polar](https://polar.sh)
- [Neon](https://neon.tech)
- [Drizzle ORM](https://orm.drizzle.team)
- [Shadcn UI](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)
- [Vercel](https://vercel.com)

## 💬 Community

- **Documentation**: [docs-template.kosuke.ai](https://docs-template.kosuke.ai)
- **GitHub Issues**: [Report bugs or request features](https://github.com/filopedraz/kosuke-template/issues)
- **Pull Requests**: [Contribute to the project](https://github.com/filopedraz/kosuke-template/pulls)

---

**Ready to build your SaaS?** Check out the [documentation](https://docs-template.kosuke.ai) to get started!
