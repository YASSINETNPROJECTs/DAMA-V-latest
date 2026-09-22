import type { Metadata } from "next";
import { Card } from "@/components/Card";
import { requireUser } from "@/server/guards";
import { SettingsForm } from "./SettingsForm";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 py-4">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      <Card title="Profile details" subtitle="Visible on your public profile.">
        <SettingsForm
          initialBio={user.bio}
          initialCountry={user.country ?? ""}
          initialImage={user.image ?? ""}
        />
      </Card>

      <Card title="Account">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Email</dt>
            <dd className="text-slate-200">{user.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Role</dt>
            <dd className="text-slate-200">{user.role}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Status</dt>
            <dd className="text-slate-200">{user.status}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Member since</dt>
            <dd className="text-slate-200">
              {new Date(user.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
