import { Link } from "@tanstack/react-router";
import { GraduationCap, User } from "lucide-react";

export function AppHeader({ showProfile = true }: { showProfile?: boolean }) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/85 px-4 py-3 backdrop-blur">
      <Link to="/home" className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <GraduationCap className="h-5 w-5" />
        </span>
        <span className="text-base font-bold tracking-tight">
          Ask<span className="text-primary">Teacha</span>
        </span>
      </Link>
      {showProfile && (
        <Link
          to="/settings"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition hover:bg-muted"
          aria-label="Profile"
        >
          <User className="h-4 w-4" />
        </Link>
      )}
    </header>
  );
}
