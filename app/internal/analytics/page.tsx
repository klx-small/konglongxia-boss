import { notFound } from "next/navigation";

import { InternalAnalyticsDashboard } from "@/components/internal/InternalAnalyticsDashboard";
import { buildInternalAnalytics, isInternalAccessAllowed } from "@/lib/internal/analytics";

export const dynamic = "force-dynamic";

export default async function InternalAnalyticsPage() {
  if (!isInternalAccessAllowed()) {
    notFound();
  }

  const data = await buildInternalAnalytics();

  return <InternalAnalyticsDashboard data={data} />;
}
