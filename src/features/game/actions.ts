"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/session";
import { createDemoMatch } from "./room";

/** Server action behind the /play button: create a DEMO match and open it. */
export async function startDemoMatch(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const view = await createDemoMatch(user.id);
  redirect(`/match/${view.matchId}`);
}
