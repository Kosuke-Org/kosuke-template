export default function OrganisationNotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2">
      <h1 className="text-2xl font-bold tracking-tight">Organization not found</h1>
      <p className="text-muted-foreground text-sm">
        Select an organization from the sidebar to continue or create a new organization.{' '}
      </p>
    </div>
  );
}
