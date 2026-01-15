// components/Navbar.tsx
"use client";

import { authClient, useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, User, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Navbar() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const user = session?.user;

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() ?? "U";

  const handleLogout = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/");
          router.refresh();
        },
      },
    });
  };

  if (isPending) {
    return (
      <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-red-700">Desh TV</span>
            <span className="hidden text-sm text-muted-foreground md:inline">
              Newsroom Portal
            </span>
          </div>
          <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
        </div>
      </nav>
    );
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container flex h-12 items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-red-700">Desh TV</span>
          <span className="hidden text-sm text-muted-foreground md:inline">
            Newsroom Portal
          </span>
        </div>

        <div className="hidden md:flex items-center gap-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar>
                  <AvatarImage src={user?.image ?? undefined} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="font-medium">{user?.name ?? "User"}</p>
                <p className="text-sm text-muted-foreground">{user?.email ?? "No email"}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/profile")}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setIsMobileOpen((p) => !p)}
        >
          <Menu />
        </Button>
      </div>

      {isMobileOpen && (
        <div className="md:hidden border-t px-4 py-3">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={user?.image ?? undefined} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{user?.name ?? "User"}</p>
                <p className="text-sm text-muted-foreground">{user?.email ?? "No email"}</p>
              </div>
            </div>

            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                router.push("/profile");
                setIsMobileOpen(false);
              }}
            >
              <User className="mr-2 h-4 w-4" />
              Profile
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start text-red-600"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}