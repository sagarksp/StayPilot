import { WorkspaceDashboard } from "@/components/workspace/workspace-dashboard";

export default function ManagerDashboardPage() {
  return (
    <WorkspaceDashboard
      eyebrow="Manager workspace"
      title="Daily operations"
      description="Assigned-property activity, move-ins, rent follow-up, and resident requests will live here."
    />
  );
}
