import { renderApi } from '../../api/client';
import type { RenderProject, ProjectResult } from './types';

const RENDER_OWNER_ID = process.env.RENDER_OWNER_ID;

export const projectModule = {
  async check(name: string): Promise<ProjectResult | null> {
    const response = await renderApi.get<{ project: RenderProject }[]>('/projects', {
      params: { name, limit: 20 },
    });

    const projects = response.data;
    if (Array.isArray(projects) && projects.length > 0) {
      const project = projects[0].project;
      return {
        id: project.id,
        environmentId: project.environmentIds?.[0] ?? null,
      };
    }
    return null;
  },

  async create(name: string): Promise<ProjectResult> {
    console.log('📦 Creating Render project...');

    const response = await renderApi.post<{ id: string }>('/projects', {
      name,
      ownerId: RENDER_OWNER_ID,
      environments: [{ name: 'production' }],
    });

    console.log(`✅ Project created: ${response.data.id}`);
    return {
      id: response.data.id,
      environmentId: null,
    };
  },

  async getEnvironment(projectId: string): Promise<string | null> {
    const response = await renderApi.get<RenderProject>(`/projects/${projectId}`);
    return response.data.environmentIds?.[0] ?? null;
  },
};
