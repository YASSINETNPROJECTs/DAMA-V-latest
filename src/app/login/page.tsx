import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { SubmitButton } from "@/components/SubmitButton";
import { LoginForm } from "./LoginForm";
import { redirectIfAuthed } from "@/server/guards";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  await redirectIfAuthed();

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 py-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-400">
          Sign in to continue your climb. Demo password for seeded accounts:{" "}
          <code className="rounded bg-arena-800 px-1.5 py-0.5 text-accent">DamaDemo2026!</code>
        </p>
      </div>
      <LoginForm />
      <p className="text-center text-sm text-slate-400">
        No account yet?{" "}
        <Link href="/register" className="text-accent hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
