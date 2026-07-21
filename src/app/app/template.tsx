// A template (not layout) re-mounts on every navigation within /app, which
// is what makes the CSS animation below actually replay on each page
// change — no animation library needed for a simple fade/slide-in.
export default function AppTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="page-transition">{children}</div>;
}
