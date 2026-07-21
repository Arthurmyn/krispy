import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewProjectForm } from "@/components/app/NewProjectForm";
import { AppShell } from "@/components/app/AppShell";
import { SignInScreen } from "@/components/app/SignInScreen";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    return <SignInScreen />;
  }

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <AppShell
      userLabel={session.user.email ?? session.user.name ?? "Account"}
      projects={projects.map((p) => ({
        id: p.id,
        title: p.topic ?? p.category,
        status: p.status,
      }))}
    >
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-12 px-8 pb-20 pt-36">
        <div className="flex flex-col items-center gap-8 text-center">
          <h1 className="text-3xl font-semibold text-text-primary">
            What kind of video do you want to create?
          </h1>
          <div className="w-full max-w-3xl">
            <NewProjectForm />
          </div>
        </div>

        {projects.length > 0 ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-medium tracking-wide text-text-tertiary uppercase">
              Recent projects
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/app/projects/${project.id}`}
                  className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3.5 transition-colors hover:bg-surface-hover"
                >
                  <span className="truncate text-sm text-text-primary">
                    {project.topic ?? project.category}
                  </span>
                  <span className="ml-3 shrink-0 rounded-full bg-surface-hover px-2.5 py-1 text-xs text-text-secondary">
                    {project.status.replaceAll("_", " ").toLowerCase()}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </AppShell>
  );
}
