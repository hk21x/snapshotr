import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold">404</h1>
        <p className="text-muted-foreground">Page not found.</p>
        <Button asChild>
          <Link href="/">Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
