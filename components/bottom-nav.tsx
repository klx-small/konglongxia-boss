import Link from "next/link";
import { CalendarDays, Crosshair, Home, Swords } from "lucide-react";

const navItems = [
  { href: "/", label: "首页", icon: Home },
  { href: "/courses", label: "课表", icon: CalendarDays },
  { href: "/goals", label: "目标", icon: Crosshair },
  { href: "/battle/today", label: "副本", icon: Swords }
] as const;

export function BottomNav() {
  return (
    <nav
      aria-label="主导航"
      className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 px-2 py-2 shadow-sm backdrop-blur md:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              className="flex h-12 flex-col items-center justify-center rounded-lg text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
              href={item.href}
              key={item.href}
            >
              <Icon className="mb-1 h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

