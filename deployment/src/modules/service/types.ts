export type ServiceType = 'web_service' | 'pserv';
export type ServiceRuntime = 'docker' | 'node';

export interface ServiceConfig {
  name: string;
  type: ServiceType;
  plan: string;
  region: string;
  envVars?: Record<string, string>;
  gitRepo?: string;
  branch?: string;
  rootDir?: string;
  runtime?: ServiceRuntime;
  notificationEmail?: string;
}

export interface ServiceResult {
  id: string;
  url: string;
  deployId: string;
}

export interface RenderService {
  id: string;
  name: string;
  status?: string;
  serviceDetails?: {
    url?: string;
  };
}

export interface DeployInfo {
  service?: RenderService;
  deployId?: string;
}
