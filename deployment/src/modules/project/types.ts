export interface RenderProject {
  id: string;
  name: string;
  environmentIds?: string[];
}

export interface ProjectResult {
  id: string;
  environmentId: string | null;
}
