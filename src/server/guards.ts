import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/session";

/** Server-side guard for protected pages. Redirects to /login when signed out. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Redirect signed-in users away from guest pages like /login and /register. */
export async function redirectIfAuthed() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
}

/** Admin RBAC guard: only signed-in ADMIN role passes. */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}
