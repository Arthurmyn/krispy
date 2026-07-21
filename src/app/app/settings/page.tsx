import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SettingsTabs } from "@/components/app/SettingsTabs";
import { AppShell } from "@/components/app/AppShell";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/app");

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [projects, videosThisMonth, dbUser] = await Promise.all([
    prisma.project.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.project.count({
      where: { userId: session.user.id, createdAt: { gte: startOfMonth } },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    }),
  ]);

  const userEmail = session.user.email ?? "Account";
  const signInMethod =
    process.env.NODE_ENV !== "production" ? "dev email (local only)" : "Google";

  return (
    <AppShell
      userLabel={userEmail}
      projects={projects.map((p) => ({
        id: p.id,
        title: p.topic ?? p.category,
        status: p.status,
      }))}
    >
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-8 py-16">
        <h1 className="text-xl font-semibold text-text-primary">Settings</h1>

        <SettingsTabs
          userEmail={userEmail}
          userName={session.user.name ?? null}
          signInMethod={signInMethod}
          videosThisMonth={videosThisMonth}
          hasPassword={Boolean(dbUser?.passwordHash)}
        />
      </main>
    </AppShell>
  );
}
