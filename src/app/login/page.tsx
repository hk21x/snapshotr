"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
      });

      if (res.ok) {
        document.cookie = `snapshotr-token=${key}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Strict`;
        window.location.href = "/";
      } else {
        setError("Invalid API key");
      }
    } catch {
      setError("Connection failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg text-center">Snapshotr</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Enter your API key"
                autoFocus
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" disabled={loading || !key} className="w-full">
              {loading ? "Authenticating..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
