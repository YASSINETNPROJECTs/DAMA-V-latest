import type { Metadata } from "next";
import { requireUser } from "@/server/guards";
import { TestBoardClient } from "./TestBoardClient";

export const metadata: Metadata = { title: "Test Board" };

export default async function TestBoardPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto max-w-lg py-4">
      <TestBoardClient username={user.username} />
    </div>
  );
}
