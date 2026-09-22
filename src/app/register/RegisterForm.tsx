"use client";

import { useFormState } from "react-dom";
import { registerAction } from "@/features/auth/actions";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { SubmitButton } from "@/components/SubmitButton";

export function RegisterForm() {
  const [state, formAction] = useFormState(registerAction, {});

  return (
    <Card>
      <form action={formAction} className="flex flex-col gap-4">
        <Input
          label="Username"
          name="username"
          autoComplete="username"
          placeholder="grandmaster_1"
          minLength={3}
          maxLength={20}
          required
        />
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
          autoComplete="new-password"
          placeholder="8+ chars, a letter and a number"
          minLength={8}
          required
        />
        <Input
          label="Country (optional)"
          name="country"
          placeholder="DZ"
          maxLength={2}
          autoCapitalize="characters"
        />
        {state.error ? (
          <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {state.error}
          </p>
        ) : null}
        <SubmitButton label="Create account" pendingLabel="Creating…" />
      </form>
    </Card>
  );
}
