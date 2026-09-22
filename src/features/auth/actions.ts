"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { appConfig } from "@/config/app";
import { hashPassword, verifyPassword } from "./password";
import { createSession, destroySession } from "./session";
import { loginSchema, registerSchema, profileUpdateSchema } from "./schemas";
import type { AuthFormState } from "@/types";

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    username: formData.get("username"),
    email: formData.get("email"),
    password: formData.get("password"),
    country: formData.get("country") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { username, email, password, country } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: normalizedEmail }, { username: username.toLowerCase() }] },
    select: { email: true, username: true },
  });
  if (existing) {
    return {
      error: existing.email === normalizedEmail
        ? "That email is already registered"
        : "That username is taken",
    };
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      username: username.toLowerCase(),
      email: normalizedEmail,
      passwordHash,
      country: country || null,
      rating: appConfig.startingRating,
      profile: { create: {} },
      stats: { create: {} },
      ratingState: { create: { currentRating: appConfig.startingRating } },
      auditLogs: {
        create: { action: "USER_REGISTERED", meta: { username: username.toLowerCase() } },
      },
    },
  });

  await createSession(user.id);
  redirect("/dashboard");
}

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const email = parsed.data.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });

  // Same error for unknown email / wrong password (no account enumeration).
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "Invalid email or password" };
  }
  if (user.status !== "ACTIVE") {
    return { error: "This account is not active" };
  }

  await createSession(user.id);
  await prisma.auditLog.create({
    data: { userId: user.id, action: "USER_LOGGED_IN" },
  });

  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
const token = cookieStore.get("dama_session")?.value;

  if (token) {
    const session = await prisma.session.findUnique({ where: { token } });
    if (session) {
      await prisma.auditLog.create({
        data: { userId: session.userId, action: "USER_LOGGED_OUT" },
      });
    }
  }
  await destroySession();
  redirect("/");
}

export async function updateProfileAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = profileUpdateSchema.safeParse({
    bio: formData.get("bio") ?? "",
    country: formData.get("country") || undefined,
    image: formData.get("image") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { getCurrentUser } = await import("./session");
  const user = await getCurrentUser();
  if (!user) return { error: "You must be signed in" };

  const { bio, country, image } = parsed.data;
  await prisma.user.update({
    where: { id: user.id },
    data: {
      bio,
      country: country || null,
      image: image || null,
      auditLogs: { create: { action: "PROFILE_UPDATED" } },
    },
  });

  return { success: true };
}
