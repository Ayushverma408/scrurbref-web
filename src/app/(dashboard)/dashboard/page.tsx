import DashboardShell from "./components/DashboardShell";

// No server-side fetch — thread navigation stays instant.
// isFirstTime is determined client-side via cached session (no network call).
export default function DashboardPage() {
  return <DashboardShell />;
}
