import type { SchedulableTask } from "@/lib/scheduler/scheduleTasks";

const typeWeight: Record<SchedulableTask["taskType"], number> = {
  boss_battle: 3,
  elite_monster: 2,
  daily_dungeon: 1,
  rescue_dungeon: 1,
  small_monster: 0
};

export function sortTasksForScheduling<T extends SchedulableTask>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    const deadlineDiff = a.deadline.localeCompare(b.deadline);

    if (deadlineDiff !== 0) {
      return deadlineDiff;
    }

    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }

    if (b.difficulty !== a.difficulty) {
      return b.difficulty - a.difficulty;
    }

    const typeDiff = typeWeight[b.taskType] - typeWeight[a.taskType];

    if (typeDiff !== 0) {
      return typeDiff;
    }

    return a.id.localeCompare(b.id);
  });
}
