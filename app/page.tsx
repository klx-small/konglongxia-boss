import { DashboardActionCenter } from "@/components/dashboard/DashboardActionCenter";
import { Card, CardContent } from "@/components/ui/card";
import { loadDashboardSnapshot } from "@/lib/onboarding/dashboard-data";
import { errorStateText } from "@/lib/ui/status-text";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const snapshot = await safeLoadDashboardSnapshot();

  if (!snapshot) {
    return <DashboardError />;
  }

  return <DashboardActionCenter snapshot={snapshot} />;
}

async function safeLoadDashboardSnapshot() {
  try {
    return await loadDashboardSnapshot();
  } catch {
    return null;
  }
}

function DashboardError() {
  return (
    <Card>
      <CardContent className="p-4 text-sm font-medium text-destructive">
        {errorStateText}
      </CardContent>
    </Card>
  );
}
