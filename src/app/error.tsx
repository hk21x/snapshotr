"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-md">
        <h1 className="text-4xl font-bold">Something went wrong</h1>
        <p className="text-muted-foreground">
          {error.message || "An unexpected error occurred."}
        </p>
        <Button onClick={reset}>Try Again</Button>
      </div>
    </div>
  );
}
