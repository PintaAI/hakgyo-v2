type RoutePlaceholderProps = {
  title: string;
  description?: string;
  params?: Record<string, string>;
};

export function RoutePlaceholder({
  title,
  description = "This route is ready for its future page content.",
  params,
}: RoutePlaceholderProps) {
  return (
    <section className="bg-card text-card-foreground rounded-xl border p-6 shadow-sm">
      <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
        Hakgyo route
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">{title}</h1>
      <p className="text-muted-foreground mt-2 text-sm">{description}</p>
      {params && Object.keys(params).length > 0 ? (
        <dl className="mt-6 grid gap-3 sm:grid-cols-2">
          {Object.entries(params).map(([key, value]) => (
            <div key={key} className="bg-muted rounded-lg px-4 py-3">
              <dt className="text-muted-foreground text-xs font-medium">
                {key}
              </dt>
              <dd className="mt-1 font-mono text-sm">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}
