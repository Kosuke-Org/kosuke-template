import { renderApi } from '../../api/client';

export const environmentModule = {
  async attachResources(environmentId: string, resourceIds: string[]): Promise<void> {
    console.log('📎 Attaching resource to environment...');
    await renderApi.post(`/environments/${environmentId}/resources`, {
      resourceIds,
    });
    console.log('✅ Resource attached to environment');
  },
};
