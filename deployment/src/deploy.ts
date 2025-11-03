import { projectModule } from './modules/project/project';
import { databaseModule } from './modules/database/database';
import { serviceModule } from './modules/service/service';
import { environmentModule } from './modules/environment/environment';
import { askConfirmation } from './utils/confirmation';
import { validateRequiredEnvVars } from './utils/validation';
import { RenderApiError } from './api/client';
import type { ServiceConfig } from './modules/service/types';

const GIT_REPO = process.env.GIT_REPO;
const RENDER_OWNER_ID = process.env.RENDER_OWNER_ID;

interface DeploymentState {
  projectId: string;
  environmentId: string | null;
  databaseId: string;
  connectionString: string;
  engineUrl?: string;
  appUrl?: string;
}

async function deployProject(state: DeploymentState): Promise<void> {
  const createProject = await askConfirmation('\n✓ Create or use existing project?');

  if (!createProject) {
    console.log('⏭️  Skipping project creation - using existing');
    const existing = await projectModule.check('kosuke');
    if (!existing) {
      throw new Error('No existing project found. Please create one first.');
    }
    state.projectId = existing.id;
    state.environmentId = existing.environmentId;
  } else {
    const existing = await projectModule.check('kosuke');
    if (existing) {
      console.log(`✅ Project already exists: ${existing.id}`);
      state.projectId = existing.id;
      state.environmentId = existing.environmentId;
    } else {
      const result = await projectModule.create('kosuke');
      state.projectId = result.id;
      state.environmentId = result.environmentId;
    }
  }
  console.log(`✅ Using project: ${state.projectId}\n`);
}

async function deployDatabase(state: DeploymentState): Promise<void> {
  const createDb = await askConfirmation('\n✓ Create PostgreSQL database?');

  if (!createDb) {
    console.log('⏭️  Skipping database creation');
    const existing = await databaseModule.check('test');
    if (!existing) {
      throw new Error('No existing database found. Please create one first.');
    }
    state.databaseId = existing.id;
    state.connectionString = existing.connectionString;
  } else {
    const existing = await databaseModule.check('test');
    if (existing) {
      console.log(`✅ Database already exists: ${existing.id}`);
      console.log(`📋 Connection string: ${existing.connectionString}`);
      state.databaseId = existing.id;
      state.connectionString = existing.connectionString;
    } else {
      const result = await databaseModule.create();
      state.databaseId = result.id;
      state.connectionString = result.connectionString;

      // Attach database to project environment
      const envId = await projectModule.getEnvironment(state.projectId);
      if (envId) {
        await environmentModule.attachResources(envId, [state.databaseId]);
      } else {
        console.log('⚠️  No environment found to attach database to');
      }
      await databaseModule.waitForAvailability(state.databaseId);
    }
  }
}

async function deployEngine(state: DeploymentState): Promise<void> {
  const createEngine = await askConfirmation('\n✓ Create Python engine service?');

  if (!createEngine) {
    console.log('⏭️  Skipping engine service');
    const existing = await serviceModule.check('kosuke-engine');
    if (existing) {
      state.engineUrl = existing.url;
    }
  } else {
    const existing = await serviceModule.check('kosuke-engine');
    if (existing) {
      console.log(`✅ Engine service already exists: ${existing.id}`);
      state.engineUrl = existing.url;
    } else {
      const engineConfig: ServiceConfig = {
        name: 'kosuke-engine',
        type: 'web_service',
        plan: 'starter',
        region: 'oregon',
        gitRepo: GIT_REPO!,
        rootDir: 'engine',
        envVars: {
          ENVIRONMENT: 'production',
        },
        notificationEmail: process.env.NOTIFICATION_EMAIL,
      };

      const { id, url, deployId } = await serviceModule.create(engineConfig);
      state.engineUrl = url;

      // Attach to environment
      const envId = await projectModule.getEnvironment(state.projectId);
      if (envId) {
        await environmentModule.attachResources(envId, [id]);
      }

      await serviceModule.waitForDeployment(id, deployId);
    }
  }
}

async function deployApp(state: DeploymentState): Promise<void> {
  const createApp = await askConfirmation('\n✓ Create Next.js app service?');

  if (!createApp) {
    console.log('⏭️  Skipping app service');
    const existing = await serviceModule.check('kosuke-app');
    if (!existing) {
      throw new Error('No existing app service found. Please create one first.');
    }
    state.appUrl = existing.url;
  } else {
    const existing = await serviceModule.check('kosuke-app');
    if (existing) {
      console.log(`✅ App service already exists: ${existing.id}`);
      state.appUrl = existing.url;
    } else {
      const appEnvVars: Record<string, string> = {
        NODE_ENV: 'production',
        NEXT_TELEMETRY_DISABLED: '1',
        POSTGRES_URL: state.connectionString,
      };

      if (state.engineUrl) {
        appEnvVars.ENGINE_URL = state.engineUrl;
      }

      // Add optional secrets
      const optionalVars: Record<string, string | undefined> = {
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY,
        CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
        CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
        STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
        STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
        RESEND_API_KEY: process.env.RESEND_API_KEY,
        BLOB_READ_WRITE_TOKEN: process.env.BLOB_TOKEN,
        SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
      };

      Object.entries(optionalVars).forEach(([key, value]) => {
        if (value) appEnvVars[key] = value;
      });

      const appConfig: ServiceConfig = {
        name: 'kosuke-app',
        type: 'web_service',
        plan: 'starter',
        region: 'oregon',
        gitRepo: GIT_REPO!,
        runtime: 'node',
        envVars: appEnvVars,
        notificationEmail: process.env.NOTIFICATION_EMAIL,
      };

      const { id, url, deployId } = await serviceModule.create(appConfig);
      state.appUrl = url;

      // Attach to environment
      const envId = await projectModule.getEnvironment(state.projectId);
      if (envId) {
        await environmentModule.attachResources(envId, [id]);
      }

      await serviceModule.waitForDeployment(id, deployId);
    }
  }
}

function printDeploymentSummary(state: DeploymentState): void {
  console.log(`\n✨ Deployment complete!\n`);
  console.log(
    `Project:  https://dashboard.render.com/teams/${RENDER_OWNER_ID}/projects/${state.projectId}`
  );
  console.log(`App:      ${state.appUrl}`);
  console.log(`Engine:   ${state.engineUrl}`);
}

export async function deploy(): Promise<void> {
  validateRequiredEnvVars({
    RENDER_API_KEY: process.env.RENDER_API_KEY,
    RENDER_OWNER_ID,
    GIT_REPO,
  });

  console.log('\n📋 Deployment Plan:\n');
  console.log('0. Render Project (kosuke)');
  console.log('1. PostgreSQL Database (kosuke-postgres)');
  console.log('2. Python Engine Service (stateless, ENVIRONMENT var only)');
  console.log('3. Next.js App Service (with all env vars)\n');

  const startDeploy = await askConfirmation('Proceed with deployment?');
  if (!startDeploy) {
    console.log('❌ Deployment cancelled');
    process.exit(0);
  }

  const state: DeploymentState = {
    projectId: '',
    environmentId: null,
    databaseId: '',
    connectionString: '',
  };

  try {
    await deployProject(state);
    await deployDatabase(state);
    await deployEngine(state);
    await deployApp(state);
    printDeploymentSummary(state);
  } catch (error) {
    if (error instanceof RenderApiError) {
      console.error('❌ Render API Error:', error.data);
    } else {
      console.error('❌ Error:', error);
    }
    process.exit(1);
  }
}
