"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function normaliseAuthError(message: string) {
  if (!/failed to fetch/i.test(message)) return message;

  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const host = (() => {
    if (!configuredUrl) return "missing NEXT_PUBLIC_SUPABASE_URL";
    try {
      return new URL(configuredUrl).host;
    } catch {
      return configuredUrl;
    }
  })();

  if (/localhost|127\.0\.0\.1/i.test(configuredUrl)) {
    return `Cannot reach Supabase (${host}). This looks like a local URL. In Vercel, set NEXT_PUBLIC_SUPABASE_URL to https://<project-ref>.supabase.co and redeploy.`;
  }

  return `Cannot reach Supabase (${host}). Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel, then redeploy.`;
}

export default function SignupPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      setLoading(false);

      if (signUpError) {
        setError(normaliseAuthError(signUpError.message));
        return;
      }

      router.replace("/dashboard");
    } catch (err) {
      setLoading(false);
      const rawMessage = err instanceof Error ? err.message : "Failed to fetch";
      setError(normaliseAuthError(rawMessage));
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 shadow-xl shadow-stone-900/5">
        <h1 className="text-2xl font-semibold text-stone-900">Create account</h1>
        <p className="mt-1 text-sm text-stone-600">Start tracking applications in one place.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              name="full_name"
              required
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <FieldError message={error} />

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </Button>
        </form>

        <p className="mt-5 text-sm text-stone-600">
          Already registered?{" "}
          <Link className="font-medium text-stone-700 hover:text-stone-800" href="/login">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
