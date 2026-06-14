import { Check, Circle, Play } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getOnboardingSteps,
  type DashboardSnapshot,
  type OnboardingStepStatus
} from "@/lib/onboarding/status";

type OnboardingChecklistProps = {
  snapshot: DashboardSnapshot;
};

const statusText: Record<OnboardingStepStatus, string> = {
  completed: "已完成",
  current: "进行中",
  pending: "未开始"
};

export function OnboardingChecklist({ snapshot }: OnboardingChecklistProps) {
  const steps = getOnboardingSteps(snapshot);

  return (
    <Card>
      <CardHeader>
        <CardTitle>上手进度</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step) => (
          <div className="flex items-center gap-3 rounded-lg bg-secondary p-3" key={step.key}>
            <StepIcon status={step.status} />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{step.label}</p>
              <p className="text-sm text-muted-foreground">{statusText[step.status]}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function StepIcon({ status }: { status: OnboardingStepStatus }) {
  if (status === "completed") {
    return <Check aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />;
  }

  if (status === "current") {
    return <Play aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />;
  }

  return <Circle aria-hidden="true" className="h-5 w-5 shrink-0 text-muted-foreground" />;
}
