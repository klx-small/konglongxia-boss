import Link from "next/link";

import { Button } from "@/components/ui/button";

const links = [
  { href: "/debug", label: "Debug" },
  { href: "/internal/checklist", label: "Checklist" },
  { href: "/internal/analytics", label: "Analytics" },
  { href: "/internal/readiness", label: "Readiness" },
  { href: "/internal/test-plan", label: "Test Plan" }
] as const;

export function InternalNav() {
  return (
    <nav aria-label="内部工具导航" className="flex flex-wrap gap-2">
      {links.map((link) => (
        <Button asChild key={link.href} size="sm" variant="secondary">
          <Link href={link.href}>{link.label}</Link>
        </Button>
      ))}
    </nav>
  );
}
