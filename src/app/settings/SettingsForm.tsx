"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { updateProfileAction } from "@/features/auth/actions";
import { Input } from "@/components/Input";
import { SubmitButton } from "@/components/SubmitButton";

interface SettingsFormProps {
  initialBio: string;
  initialCountry: string;
  initialImage: string;
}

export function SettingsForm({ initialBio, initialCountry, initialImage }: SettingsFormProps) {
  const [state, formAction] = useFormState(updateProfileAction, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="bio" className="text-sm font-medium text-slate-300">
          Bio
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          maxLength={300}
          defaultValue={initialBio}
          placeholder="Tell opponents who they're facing…"
          className="w-full rounded-xl border border-arena-600 bg-arena-800 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
      </div>
      <Input
        label="Country"
        name="country"
        defaultValue={initialCountry}
        placeholder="DZ"
        maxLength={2}
      />
      <Input
        label="Avatar image URL"
        name="image"
        type="url"
        defaultValue={initialImage}
        placeholder="https://…"
      />
      {state.error ? (
        <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
          Profile saved.
        </p>
      ) : null}
      <SubmitButton label="Save changes" pendingLabel="Saving…" variant="secondary" />
    </form>
  );
}
