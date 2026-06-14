import { notFound } from "next/navigation";

import { InternalDeploymentReadiness } from "@/components/internal/InternalDeploymentReadiness";
import {
  buildDeploymentReadiness,
  isInternalAccessAllowed
} from "@/lib/internal/deployment-readiness";

export const dynamic = "force-dynamic";

export default async function InternalReadinessPage() {
  if (!isInternalAccessAllowed()) {
    notFound();
  }

  const data = await buildDeploymentReadiness();

  return <InternalDeploymentReadiness data={data} />;
}
