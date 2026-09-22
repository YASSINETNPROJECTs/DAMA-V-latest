"use client";

import { useFormState } from "react-dom";
import { loginAction } from "@/features/auth/actions";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { SubmitButton } from "@/components/SubmitButton";

export function LoginForm() {
  const [state, formAction] = useFormState(loginAction, {});

  return (
    <Card>
      <form action={formAction} className="flex flex-col gap-4">
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
        {state.error ? (
          <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {state.error}
          </p>
        ) : null}
        <SubmitButton label="Sign in" pendingLabel="Signing in…" />
      </form>
    </Card>
  );
}
