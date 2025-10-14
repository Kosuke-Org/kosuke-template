---
sidebar_position: 3
---

# Step 2: Create Vercel Project

Deploy your forked repository to Vercel. This will create your production environment and set up automatic deployments.

## Why Vercel?

Vercel provides:

- Automatic deployments from Git
- Edge network for optimal performance
- Built-in SSL certificates
- Environment variable management
- Integration with Neon (database) and Blob (storage)

## Step-by-Step Instructions

### 1. Go to Vercel

Visit [vercel.com/new](https://vercel.com/new) and sign in with your GitHub account if you haven't already.

### 2. Import Git Repository

1. Click **"Import Git Repository"**
2. If prompted, click **"Continue with GitHub"**
3. Authorize Vercel to access your repositories if asked

### 3. Select Your Repository

1. Find your forked repository in the list
2. Click **"Import"** next to your repository name
   - Can't find it? Use the search or check the "Select a Git Namespace" dropdown

### 4. Configure Project

On the configuration screen:

#### Project Name

- Enter your project name (should match your repository)
- This will be your default domain: `your-project-name.vercel.app`

#### Framework Preset

- Should auto-detect: **Next.js**
- If not, select it manually

#### Root Directory

- Leave as `./` (default)

#### Build Settings

- **Build Command**: Leave default (`next build`)
- **Output Directory**: Leave default (`.next`)
- **Install Command**: Leave default (`pnpm install`)

### 5. Deploy

Click **"Deploy"** and wait for the build to complete.

:::warning Expected Deployment Failure
Your first deployment will fail with an error like:

```
Error: POSTGRES_URL environment variable is not set
```

This is expected! We'll fix this by setting up the database and storage in the next steps. The Vercel project is still created successfully.
:::

## Set Up Blob Storage

After the (failed) deployment, set up file storage:

### 1. Navigate to Storage Tab

1. In your Vercel project dashboard, click the **"Storage"** tab
2. Click **"Create Database"**

### 2. Create Blob Store

1. Select **"Blob"**
2. Name it: `your-project-name-blob`
3. Click **"Create"**

### 3. Automatic Configuration

Vercel automatically adds the following environment variable to your project:

- `BLOB_READ_WRITE_TOKEN`

:::tip No Manual Configuration Needed
Unlike other environment variables, Vercel manages the Blob token automatically. You don't need to copy or configure anything manually.
:::

## Save Your URLs

After creation, save these URLs:

### Project Dashboard

```
https://vercel.com/YOUR_USERNAME/YOUR_PROJECT_NAME
```

### Application URL (after successful redeploy)

```
https://YOUR_PROJECT_NAME.vercel.app
```

## Vercel Project Settings

Familiarize yourself with these sections:

### Deployments

- View all deployments
- Inspect build logs
- Preview deployments from branches

### Settings

- **Environment Variables**: Where you'll add API keys
- **Domains**: Add custom domains later
- **Functions**: Configure serverless functions
- **Storage**: Manage Blob storage

### Integrations

- **Neon**: Database integration (next step)
- **GitHub**: Source control settings

## Understanding Deployment Status

Your Vercel dashboard shows deployment status:

| Status      | Meaning                              |
| ----------- | ------------------------------------ |
| 🔨 Building | Compiling your application           |
| ✅ Ready    | Successfully deployed                |
| ❌ Failed   | Build error (expected at this stage) |
| 🔄 Queued   | Waiting to build                     |

## Common Questions

### Why did my deployment fail?

This is expected! The application needs:

- Database connection (next step)
- Environment variables (later steps)
- Clerk authentication keys
- Other service configurations

### Can I change the project name?

Yes, in Settings → General → Project Name. Note:

- Changes your default domain
- Doesn't affect your custom domain
- May require updating environment variables

### What's the difference between Production and Preview?

- **Production**: Main branch deployments
- **Preview**: Pull request and branch deployments
- **Development**: Local development environment

### How many deployments can I have?

Vercel's free tier includes:

- Unlimited deployments
- 100 GB bandwidth per month
- 100 GB-hours serverless function execution

## Next Steps

Now that your Vercel project is created:

👉 **[Step 3: Set Up Neon Database](./03-neon-database.md)**

---

**Having issues?** Check the [Troubleshooting](../reference/troubleshooting) guide.
