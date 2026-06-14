import { ArrowRight, Compass } from "lucide-react";

import { DemoSetupButton } from "@/components/demo/DemoSetupButton";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getDashboardAction, type DashboardSnapshot } from "@/lib/onboarding/status";

type DashboardActionCenterProps = {
  snapshot: DashboardSnapshot;
};

export function DashboardActionCenter({ snapshot }: DashboardActionCenterProps) {
  const action = getDashboardAction(snapshot);

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <p className="text-sm font-medium text-primary">恐龙侠打BOSS</p>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold leading-tight">下一步行动中心</h1>
          <p className="text-sm text-muted-foreground">
            恐龙侠会根据你的课表、Boss 和本周副本，告诉你现在最该做什么。
          </p>
        </div>
      </section>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex items-start gap-3">
            <Compass className="mt-1 h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0 space-y-2">
              <h2 className="text-2xl font-bold leading-tight">{action.title}</h2>
              <p className="text-sm text-muted-foreground">
                先完成这一步，后面的战役路线会自动接上。
              </p>
            </div>
          </div>
          <Button asChild className="w-full">
            <a href={action.href}>
              {action.buttonLabel}
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        </CardContent>
      </Card>

      <DemoSetupButton />
      <OnboardingChecklist snapshot={snapshot} />
    </div>
  );
}
