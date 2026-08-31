import { LoaderCircleIcon } from "lucide-react";

export default function WorkspaceLoading() {
  return (
    <div className="grid min-h-[calc(100svh-8rem)] w-full place-items-center p-8">
      <LoaderCircleIcon
        className="text-muted-foreground size-6 animate-spin"
        aria-label="Loading"
      />
    </div>
  );
}
