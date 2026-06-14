import { notFound } from "next/navigation";

import { InternalTestPlan } from "@/components/internal/InternalTestPlan";
import { isInternalAccessAllowed } from "@/lib/internal/metrics";

export const dynamic = "force-dynamic";

export default function InternalTestPlanPage() {
  if (!isInternalAccessAllowed()) {
    notFound();
  }

  return <InternalTestPlan />;
}
