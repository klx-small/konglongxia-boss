import { Flame } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import type { UserProgress } from "@/lib/types";

type XpBarProps = {
  progress: UserProgress;
};

export function XpBar({ progress }: XpBarProps) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">恐龙侠等级</p>
            <p className="text-xl font-bold">Lv. {progress.level}</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm font-semibold">
            <Flame className="h-4 w-4 text-primary" />
            连续 {progress.streakDays} 天
          </div>
        </div>
        <Progress
          label="经验值进度"
          value={progress.currentXp}
          max={progress.nextLevelXp}
        />
        <p className="text-sm text-muted-foreground">
          {progress.currentXp} / {progress.nextLevelXp} XP
        </p>
      </CardContent>
    </Card>
  );
}

