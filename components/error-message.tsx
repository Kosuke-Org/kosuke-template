export const ErrorMessage = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="max-w-xl space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
        {children}
      </div>
    </div>
  );
};
