---
sidebar_position: 3
---

# Contributing Guide

Thank you for considering contributing to Kosuke Template! This guide will help you understand our development workflow, PR labeling system, and versioning process.

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm 10
- Docker (for PostgreSQL)
- Python 3.12+ (for engine development)

### Local Development

1. **Clone your fork:**

```bash
git clone https://github.com/YOUR_USERNAME/kosuke-template.git
cd kosuke-template
```

2. **Install dependencies:**

```bash
pnpm install
```

3. **Set up environment:**

```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

4. **Start development server:**

```bash
docker compose up -d  # Start PostgreSQL
pnpm run dev          # Start Next.js
```

5. **Run tests:**

```bash
pnpm run test         # TypeScript tests
pnpm run test:engine  # Python tests
```

## Pull Request Guidelines

### PR Labels (Required)

**Every PR must have at least one label** to be included in the changelog. Labels determine how changes are categorized in release notes.

#### Label Categories

| Label | Description | Example |
|-------|-------------|---------|
| 💥 **breaking** | Breaking changes requiring migration | API route restructure, database schema changes |
| 🚀 **feature** | New features and capabilities | Add payment integration, new dashboard |
| 🐛 **bug** | Bug fixes and corrections | Fix auth redirect, resolve crash |
| 📚 **documentation** | Documentation updates | Update deployment guide, add examples |
| 🔧 **enhancement** | Improvements to existing features | Optimize queries, improve UX |
| ⚡ **performance** | Performance improvements | Cache optimization, reduce bundle size |
| 🔒 **security** | Security fixes and updates | Patch vulnerability, update deps |
| 🧹 **chore** | Maintenance and internal changes | Update CI, refactor code, dependency updates |

#### How to Add Labels

**Option 1: When Creating PR (Recommended)**
1. Click **Labels** in the PR sidebar
2. Select appropriate label(s)
3. Multiple labels allowed (e.g., `feature` + `documentation`)

**Option 2: Via PR Title (Auto-labeling)**

Use conventional commit prefixes in your PR title:

```
feat: Add Stripe payment integration          → feature
fix: Resolve authentication redirect bug       → bug
docs: Update deployment guide                  → documentation
perf: Optimize database queries                → performance
chore: Update dependencies                     → chore
BREAKING: Restructure API routes               → breaking
```

**Option 3: Comment on PR**

Comment `/label feature` to add the `feature` label (requires maintainer permissions).

### PR Title Guidelines

Use clear, descriptive titles:

✅ **Good:**
- `feat: Add Polar billing webhook integration`
- `fix: Resolve Clerk organization sync race condition`
- `docs: Add Fly.io deployment guide`

❌ **Bad:**
- `Update files`
- `Bug fix`
- `Changes`

### PR Description Template

```markdown
## What's Changed
Brief description of changes

## Type of Change
- [ ] 🚀 New feature
- [ ] 🐛 Bug fix
- [ ] 📚 Documentation
- [ ] 🔧 Enhancement
- [ ] ⚡ Performance
- [ ] 💥 Breaking change

## Testing
- [ ] Tests pass locally
- [ ] Added new tests for changes
- [ ] Manual testing completed

## Screenshots (if applicable)
[Add screenshots for UI changes]

## Breaking Changes (if applicable)
Describe migration steps if this is a breaking change

## Related Issues
Closes #123
```

## Versioning & Releases

### Semantic Versioning

Kosuke Template follows [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`

- **MAJOR** (v2.0.0): Breaking changes, requires migration
- **MINOR** (v1.1.0): New features, backward compatible
- **PATCH** (v1.0.1): Bug fixes, backward compatible

### Release Process

#### 1. Merge PRs with Proper Labels

All merged PRs are tracked for the next release. Ensure proper labels are applied.

#### 2. Determine Version Bump

**Major Release (x.0.0):**
- Any PR with `breaking` label
- Significant architectural changes
- Requires migration guide

**Minor Release (1.x.0):**
- New features (`feature` label)
- New integrations
- Backward compatible additions

**Patch Release (1.0.x):**
- Bug fixes (`bug` label)
- Documentation updates
- Performance improvements

#### 3. Create Release Tag

**Maintainers only:**

```bash
# Ensure you're on main branch
git checkout main
git pull origin main

# Create and push tag
git tag v1.2.0
git push origin v1.2.0
```

#### 4. Automated Release

Pushing a tag triggers:
1. ✅ Updates `.version` file
2. ✅ Builds and pushes Docker image
3. ✅ Creates GitHub Release with auto-generated notes
4. ✅ Categorizes changes by PR labels
5. ✅ Deploys updated documentation

#### 5. Documentation Versioning

**For major/minor releases:**

```bash
cd docs
pnpm run docusaurus docs:version 1.2.0
```

This creates a snapshot of current docs for version 1.2.0.

### Version Synchronization

Template and engine versions are kept in sync:

- **Main template**: `package.json` version
- **Engine microservice**: `engine/pyproject.toml` version
- **Documentation**: Docusaurus versioned docs

Update all three when creating a release.

## Code Quality

### Pre-commit Checks

Husky runs automatic checks:
- ESLint (TypeScript/JavaScript)
- Ruff (Python)
- Prettier formatting
- Type checking (TypeScript + mypy)

### Manual Quality Checks

```bash
# Check everything
pnpm run check:all

# Individual checks
pnpm run lint           # ESLint
pnpm run typecheck      # TypeScript
pnpm run test           # Tests
pnpm run format:check   # Prettier
```

### Python Quality Checks

```bash
cd engine

# Linting
uv run ruff check .

# Formatting
uv run ruff format .

# Type checking
uv run mypy .

# Tests
uv run pytest -v
```

## Documentation

### Updating Docs

Documentation lives in `docs/docs/`:

```bash
cd docs
pnpm install
pnpm start  # Start dev server
```

### Adding New Pages

1. Create `.md` file in `docs/docs/`
2. Add frontmatter:

```md
---
sidebar_position: 4
title: My New Page
---

# Content here
```

3. Rebuild docs: `pnpm run build`

## Getting Help

- **Questions**: Open a [GitHub Discussion](https://github.com/filopedraz/kosuke-template/discussions)
- **Bugs**: Open a [GitHub Issue](https://github.com/filopedraz/kosuke-template/issues)
- **Features**: Open a [Feature Request](https://github.com/filopedraz/kosuke-template/issues/new?template=feature_request.md)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
