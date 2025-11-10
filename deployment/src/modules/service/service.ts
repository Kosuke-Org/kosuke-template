import { renderApi } from '../../api/client';
import { poll } from '../../utils/polling';
import type { ServiceConfig, ServiceResult, RenderService, DeployInfo } from './types';

const RENDER_OWNER_ID = process.env.RENDER_OWNER_ID;

function buildServicePayload(config: ServiceConfig): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    type: config.type,
    name: config.name,
    ownerId: RENDER_OWNER_ID,
  };

  // Git configuration
  if (config.gitRepo) {
    const repo = config.gitRepo.startsWith('https://')
      ? config.gitRepo
      : `https://${config.gitRepo}`;
    payload.repo = repo;
    payload.branch = config.branch || 'main';
  }

  // Environment variables
  if (config.envVars && Object.keys(config.envVars).length > 0) {
    payload.envVars = Object.entries(config.envVars).map(([key, value]) => ({
      key,
      value,
      isSecret: false,
    }));
  }

  // Service details
  const serviceDetails: Record<string, unknown> = {
    runtime: config.runtime || 'docker',
    plan: config.plan,
    region: config.region,
    numInstances: 1,
  };

  if (config.runtime === 'node') {
    serviceDetails.envSpecificDetails = {
      buildCommand: 'bun install && bun run build',
      startCommand: 'bun start',
    };
  }

  payload.serviceDetails = serviceDetails;

  if (config.rootDir) {
    payload.rootDir = config.rootDir;
  }

  if (config.notificationEmail) {
    payload.notificationEmail = config.notificationEmail;
  }

  return payload;
}

function getServiceUrl(data: DeployInfo, serviceName: string): string {
  return data.service?.serviceDetails?.url || `https://${serviceName}.onrender.com`;
}

export const serviceModule = {
  async check(name: string): Promise<{ id: string; url: string } | null> {
    const response = await renderApi.get<{ service: RenderService }[]>('/services', {
      params: { name, includePreviews: true, limit: 20 },
    });

    const services = response.data;
    if (Array.isArray(services) && services.length > 0) {
      const service = services[0].service;
      return {
        id: service.id,
        url: service.serviceDetails?.url || `https://${service.name}.onrender.com`,
      };
    }
    return null;
  },

  async create(config: ServiceConfig): Promise<ServiceResult> {
    console.log(`🚀 Creating ${config.name} service...`);

    const payload = buildServicePayload(config);
    const response = await renderApi.post<DeployInfo>('/services', payload);

    const serviceUrl = getServiceUrl(response.data, config.name);
    const serviceId = response.data.service?.id;
    const deployId = response.data.deployId;

    console.log(`✅ ${config.name} created`);

    return { id: serviceId!, url: serviceUrl, deployId: deployId! };
  },

  async waitForDeployment(serviceId: string, deployId: string): Promise<void> {
    console.log('⏳ Waiting for deployment to complete...');

    await poll(
      async (_attempt) => {
        const response = await renderApi.get<{ status: string }>(
          `/services/${serviceId}/deploys/${deployId}`
        );
        return { status: response.data.status };
      },
      ['live'],
      ['build_failed', 'update_failed', 'canceled', 'pre_deploy_failed'],
      { maxAttempts: 120, delayMs: 5000 }
    );
  },
};
