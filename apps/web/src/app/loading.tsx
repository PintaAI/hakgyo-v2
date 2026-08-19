export default function HomeLoading() {
  return (
    <main className="bg-background text-foreground min-h-screen overflow-hidden">
      <div className="border-border bg-background h-20 animate-pulse border-b" />
      <div className="mx-auto grid max-w-7xl gap-16 px-5 pt-16 pb-24 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-10 lg:pt-28 lg:pb-32">
        <div className="animate-pulse">
          <div className="bg-muted h-8 w-52 rounded-full" />
          <div className="bg-muted mt-8 h-52 max-w-xl rounded-[2rem]" />
          <div className="bg-muted mt-8 h-6 max-w-lg rounded" />
          <div className="bg-muted mt-3 h-6 max-w-md rounded" />
        </div>
        <div className="bg-muted h-[34rem] animate-pulse rounded-[2rem]" />
      </div>
    </main>
  );
}
