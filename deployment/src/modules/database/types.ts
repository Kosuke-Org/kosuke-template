export interface RenderDatabase {
  id: string;
  status: string;
  postgres: {
    id: string;
  };
}

export interface DatabaseConnectionInfo {
  internalConnectionString: string;
}

export interface DatabaseResult {
  id: string;
  connectionString: string;
}
