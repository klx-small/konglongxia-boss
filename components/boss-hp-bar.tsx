import { Progress } from "@/components/ui/progress";

type BossHpBarProps = {
  label: string;
  currentHp: number;
  totalHp: number;
};

export function BossHpBar({ label, currentHp, totalHp }: BossHpBarProps) {
  const percentage = totalHp > 0 ? Math.round((currentHp / totalHp) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">{currentHp} / {totalHp} HP</span>
        <span className="text-muted-foreground">{percentage}%</span>
      </div>
      <Progress label={label} value={currentHp} max={totalHp} />
    </div>
  );
}

