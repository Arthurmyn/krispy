import { AnimatedBackground } from "./AnimatedBackground";
import { Sidebar, type SidebarProject } from "./Sidebar";

export type { SidebarProject };

export function AppShell({
  userLabel,
  projects,
  activeProjectId,
  children,
}: {
  userLabel: string;
  projects: SidebarProject[];
  activeProjectId?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full">
      <AnimatedBackground />
      <Sidebar
        userLabel={userLabel}
        projects={projects}
        activeProjectId={activeProjectId}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
