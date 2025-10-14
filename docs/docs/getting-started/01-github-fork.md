---
sidebar_position: 2
---

# Step 1: Fork GitHub Repository

The first step is to fork the Kosuke Template repository to your GitHub account. This creates your own copy that you can customize and deploy.

## Why Fork?

Forking allows you to:

- Maintain your own customized version
- Pull updates from the template
- Keep your modifications separate
- Deploy directly from your repository

## Step-by-Step Instructions

### 1. Visit the Template Repository

Open the Kosuke Template repository in your browser:

```
https://github.com/filopedraz/kosuke-template
```

### 2. Click the Fork Button

In the top-right corner of the page, click the **Fork** button.

### 3. Configure Your Fork

On the fork creation page:

1. **Owner**: Select your GitHub account
2. **Repository name**: Enter your project name (use kebab-case)
   - ✅ Good: `my-awesome-app`, `startup-mvp`, `saas-platform`
   - ❌ Avoid: `My App`, `MyApp123`, `my_app`
3. **Description**: Optional, add a description of your project
4. **Copy main branch only**: ✅ Check this box (recommended)

### 4. Create Fork

Click **Create fork** and wait for GitHub to create your copy.

## Naming Conventions

Choose a name that:

- Uses lowercase letters and hyphens
- Is descriptive but concise
- Doesn't include spaces or special characters
- Matches what you'll use in Vercel

**Examples:**

```bash
# Good names
open-idealista
customer-portal
team-dashboard
acme-saas

# Avoid
MyProject          # Use hyphens, not camelCase
my_project         # Use hyphens, not underscores
My Project!        # No spaces or special characters
```

## Verify Your Fork

After creation, you should see:

1. Your repository at `github.com/YOUR_USERNAME/YOUR_PROJECT_NAME`
2. A note saying "forked from filopedraz/kosuke-template"
3. All the template files in your repository

## Save Your Repository URL

You'll need this URL in later steps:

```
https://github.com/YOUR_USERNAME/YOUR_PROJECT_NAME
```

Copy and save this URL somewhere safe (notes app, password manager, etc.).

## Repository Settings (Optional)

You may want to configure:

### General Settings

- **Description**: Add a description of your SaaS application
- **Topics**: Add relevant topics (saas, nextjs, typescript, etc.)
- **Website**: Add after deploying to Vercel

### Branch Protection

After initial setup, consider enabling:

- Require pull request reviews
- Require status checks to pass
- Require branches to be up to date

### GitHub Actions

The template doesn't include CI/CD workflows by default, but you can add:

- Automated testing
- Type checking
- Linting validation

## Common Questions

### Can I rename the repository later?

Yes, but you'll need to update:

- Vercel project connection
- Local git remote URLs
- Any webhook URLs pointing to your domain

### Should I make it private?

Your choice:

- **Public**: Share your code, get community feedback
- **Private**: Keep your code confidential (requires GitHub Pro for unlimited collaborators)

### Can I sync updates from the template?

Yes! Add the original template as an upstream remote:

```bash
git remote add upstream https://github.com/filopedraz/kosuke-template.git
git fetch upstream
git merge upstream/main
```

## Next Steps

Once your repository is forked:

👉 **[Step 2: Create Vercel Project](./02-vercel-project.md)**

---

**Having issues?** Check the [Troubleshooting](../reference/troubleshooting) guide.
