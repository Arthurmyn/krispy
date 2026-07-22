import { notFound, redirect } from "next/navigation";
import { auth } from "@/backend/auth";
import { prisma } from "@/backend/prisma";
import { ProjectWorkspace } from "@/frontend/components/app/ProjectWorkspace";
import { AppShell } from "@/frontend/components/app/AppShell";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/app");

  const { id } = await params;
  const [project, projects] = await Promise.all([
    prisma.project.findFirst({
      where: { id, userId: session.user.id },
      include: {
        scenes: { orderBy: { order: "asc" } },
        chatMessages: { orderBy: { createdAt: "asc" } },
        renderJobs: { orderBy: { createdAt: "desc" }, take: 1 },
        thumbnails: { orderBy: { order: "asc" } },
      },
    }),
    prisma.project.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
    }),
  ]);
  if (!project) notFound();

  return (
    <AppShell
      userLabel={session.user.email ?? session.user.name ?? "Account"}
      activeProjectId={project.id}
      projects={projects.map((p) => ({
        id: p.id,
        title: p.topic ?? p.category,
        status: p.status,
      }))}
    >
      <ProjectWorkspace key={project.id} project={project} />
    </AppShell>
  );
}
