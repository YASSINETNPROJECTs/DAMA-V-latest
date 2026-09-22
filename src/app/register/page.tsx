import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "./RegisterForm";
import { redirectIfAuthed } from "@/server/guards";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage() {
  await redirectIfAuthed();

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 py-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">Join the arena</h1>
        <p className="mt-1 text-sm text-slate-400">
          Start at 1000 rating. Username: letters, numbers, underscore.
        </p>
      </div>
      <RegisterForm />
      <p className="text-center text-sm text-slate-400">
        Already registered?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
