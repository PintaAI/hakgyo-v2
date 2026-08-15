"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDownIcon,
  ChevronsUpDownIcon,
  LogInIcon,
  LogOutIcon,
  SettingsIcon,
  UserRoundIcon,
} from "lucide-react";
import { toast } from "sonner";

import { AccountSettings } from "~/components/account-settings";
import { AppSettings } from "~/components/app-settings";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "~/components/ui/sidebar";
import type { OrganizationRole } from "~/lib/access";
import { authClient, type Session } from "~/server/better-auth/client";

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatRole(role: string) {
  return role
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export type UserProps = {
  role?: OrganizationRole;
  variant?: "header" | "sidebar";
};

type AuthenticatedUser = Session["user"];

function UserDetails({
  user,
  role,
}: {
  user: AuthenticatedUser;
  role?: OrganizationRole;
}) {
  return (
    <>
      <Avatar>
        {user.image ? <AvatarImage src={user.image} alt="" /> : null}
        <AvatarFallback>{getInitials(user.name || user.email)}</AvatarFallback>
      </Avatar>
      <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium">{user.name}</span>
          {role ? (
            <Badge variant="secondary" className="h-5 px-1.5 text-[0.65rem]">
              {formatRole(role)}
            </Badge>
          ) : null}
        </div>
        <span className="text-muted-foreground truncate text-xs">
          {user.email}
        </span>
      </div>
    </>
  );
}

function SidebarUserMenu({
  user,
  role,
  isSigningOut,
  onOpenAccount,
  onOpenSettings,
  onSignOut,
}: {
  user: AuthenticatedUser;
  role?: OrganizationRole;
  isSigningOut: boolean;
  onOpenAccount: () => void;
  onOpenSettings: () => void;
  onSignOut: () => void;
}) {
  const { isMobile } = useSidebar();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="aria-expanded:bg-sidebar-accent aria-expanded:text-sidebar-accent-foreground"
              />
            }
          >
            <UserDetails user={user} role={role} />
            <ChevronsUpDownIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-64 rounded-lg p-2"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <div className="flex items-center gap-2 px-1 py-1.5">
              <UserDetails user={user} role={role} />
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onOpenAccount}>
              <UserRoundIcon />
              Profile & account
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenSettings}>
              <SettingsIcon />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={isSigningOut}
              onClick={onSignOut}
            >
              <LogOutIcon />
              {isSigningOut ? "Signing out..." : "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function User({ role, variant = "header" }: UserProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  if (isPending) {
    if (variant === "sidebar") {
      return (
        <div
          className="flex h-12 items-center gap-2 px-2"
          aria-label="Loading user"
        >
          <div className="bg-sidebar-accent size-8 animate-pulse rounded-lg" />
          <div className="grid flex-1 gap-1.5 group-data-[collapsible=icon]:hidden">
            <div className="bg-sidebar-accent h-3 w-24 animate-pulse rounded" />
            <div className="bg-sidebar-accent h-2.5 w-32 animate-pulse rounded" />
          </div>
        </div>
      );
    }

    return (
      <div
        className="bg-muted h-9 w-24 animate-pulse rounded-full"
        aria-label="Loading user"
      />
    );
  }

  if (!session?.user) {
    const signInHref =
      pathname === "/" ? "/" : `/?redirectTo=${encodeURIComponent(pathname)}`;

    if (variant === "sidebar") {
      return (
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sign in"
              render={<Link href={signInHref} />}
            >
              <LogInIcon />
              <span>Sign in</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      );
    }

    return (
      <Link
        href={signInHref}
        className="hover:bg-muted inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors"
      >
        <LogInIcon className="size-4" />
        Sign in
      </Link>
    );
  }

  const { user } = session;
  const initials = getInitials(user.name || user.email);
  const signOut = async () => {
    setIsSigningOut(true);
    try {
      const result = await authClient.signOut();
      if (result.error) {
        toast.error(result.error.message ?? "Sign out failed.");
        setIsSigningOut(false);
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      toast.error("Sign out failed.");
      setIsSigningOut(false);
    }
  };

  if (variant === "sidebar") {
    return (
      <>
        <SidebarUserMenu
          user={user}
          role={role}
          isSigningOut={isSigningOut}
          onOpenAccount={() => setIsAccountOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onSignOut={signOut}
        />
        <AccountSettings open={isAccountOpen} onOpenChange={setIsAccountOpen} />
        <AppSettings open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="hover:bg-muted focus-visible:ring-ring flex items-center gap-2 rounded-full p-1 pr-2 text-left transition-colors outline-none focus-visible:ring-2"
          aria-label={`Open user menu for ${user.name}`}
        >
          <Avatar>
            {user.image ? <AvatarImage src={user.image} alt="" /> : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden min-w-0 items-center gap-2 sm:flex">
            <span className="block max-w-28 truncate text-sm font-medium">
              {user.name}
            </span>
            {role ? (
              <Badge variant="secondary" className="h-5 px-1.5 text-[0.65rem]">
                {formatRole(role)}
              </Badge>
            ) : null}
          </span>
          <ChevronDownIcon className="text-muted-foreground hidden size-3.5 sm:block" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" sideOffset={8} className="w-72 p-2">
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar size="lg">
              {user.image ? <AvatarImage src={user.image} alt="" /> : null}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold">{user.name}</p>
                {role ? (
                  <Badge
                    variant="secondary"
                    className="h-5 px-1.5 text-[0.65rem]"
                  >
                    {formatRole(role)}
                  </Badge>
                ) : null}
              </div>
              <p className="text-muted-foreground truncate text-xs">
                {user.email}
              </p>
            </div>
          </div>

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsAccountOpen(true)}>
            <UserRoundIcon />
            Profile & account
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsSettingsOpen(true)}>
            <SettingsIcon />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={isSigningOut}
            onClick={signOut}
          >
            <LogOutIcon />
            {isSigningOut ? "Signing out..." : "Sign out"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AccountSettings open={isAccountOpen} onOpenChange={setIsAccountOpen} />
      <AppSettings open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </>
  );
}
