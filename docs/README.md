# Kosuke Template Documentation

This documentation site is built with [Docusaurus](https://docusaurus.io/).

## 🚀 Live Site

Visit the live documentation at: **[docs-template.kosuke.ai](https://docs-template.kosuke.ai)**

## 💻 Local Development

### Installation

```bash
cd docs
pnpm install
```

### Start Development Server

```bash
pnpm start
```

Visit [http://localhost:3000](http://localhost:3000). Changes are reflected live.

### Build

```bash
pnpm run build
```

Generates static content in the `build/` directory.

## 📁 Structure

```
docs/
├── docs/              # Documentation pages
├── blog/              # Blog posts
├── src/               # Custom components and pages
│   ├── components/   # React components
│   ├── css/          # Custom CSS
│   └── pages/        # Custom pages
└── static/           # Static assets
```

## ✍️ Contributing to Docs

### Adding Pages

1. Create `.md` or `.mdx` file in `docs/docs/`
2. Add frontmatter:

   ```markdown
   ---
   sidebar_position: 1
   ---

   # Page Title
   ```

3. Test locally: `pnpm start`
4. Commit and push

### Adding Blog Posts

1. Create file in `docs/blog/`
2. Name format: `YYYY-MM-DD-title.md`
3. Add frontmatter:
   ```markdown
   ---
   slug: post-slug
   title: Post Title
   authors: [filippo]
   tags: [tag1, tag2]
   ---
   ```

### Updating Navigation

Edit `docs/docusaurus.config.ts`:

- Update navbar items
- Update footer links
- Add custom pages

## 🎨 Styling

Custom styles in `src/css/custom.css`:

- Kosuke brand colors (indigo)
- Dark mode support
- Responsive design

## 📦 Deployment

Documentation is deployed to [docs-template.kosuke.ai](https://docs-template.kosuke.ai).

Deployment is automatic on push to main branch.

## 🔧 Configuration

Main config file: `docusaurus.config.ts`

- Site metadata
- Navbar/footer
- Theme configuration
- Plugin settings

## 📚 Documentation Standards

When writing documentation:

1. **Be clear and concise**
2. **Include examples**
3. **Use admonitions** (:::tip, :::warning, :::info)
4. **Link to related pages**
5. **Test all commands** before documenting
6. **Include troubleshooting** sections

## 🤝 Questions?

- Check the [main README](../README.md)
- Open an issue on GitHub
- Refer to [Docusaurus docs](https://docusaurus.io/docs)
