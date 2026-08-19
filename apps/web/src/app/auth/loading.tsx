export default function AuthLoading() {
  return (
    <main className="bg-background text-foreground grid min-h-screen animate-pulse lg:grid-cols-[0.9fr_1.1fr]">
      <div className="hidden p-14 lg:block">
        <div className="bg-muted size-10 rounded-xl" />
        <div className="bg-muted mt-36 h-16 max-w-md rounded-2xl" />
        <div className="bg-muted mt-4 h-5 max-w-sm rounded" />
      </div>
      <div className="bg-primary grid place-items-center p-5">
        <div className="bg-primary-foreground/15 h-[35rem] w-full max-w-[29rem] rounded-[2rem]" />
      </div>
    </main>
  );
}
