"use client";

import { useFormStatus } from "react-dom";
import { Button } from "./Button";

interface SubmitButtonProps {
  label: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "danger";
}

/** Submit button that shows a loading state automatically while the form action runs. */
export function SubmitButton({ label, pendingLabel = "Working…", variant = "primary" }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending} aria-busy={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}
