"use client";

import { useDeferredValue, useState, type FormEvent } from "react";
import {
  CrownIcon,
  LoaderCircleIcon,
  SearchIcon,
  ShieldCheckIcon,
  Trash2Icon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { api, type RouterOutputs } from "~/trpc/react";

type OrganizationRole = "OWNER" | "ADMIN" | "TEACHER";
type Member = RouterOutputs["organization"]["listMembers"][number];

const roleDetails: Record<
  OrganizationRole,
  { label: string; description: string }
> = {
  OWNER: { label: "Owner", description: "Full control and ownership" },
  ADMIN: { label: "Admin", description: "Manages members and all courses" },
  TEACHER: { label: "Teacher", description: "Creates and teaches courses" },
};

function errorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function OrganizationMembers({
  organizationId,
  currentMembershipId,
  currentRole,
}: {
  organizationId: string;
  currentMembershipId: string;
  currentRole: OrganizationRole;
}) {
  const utils = api.useUtils();
  const members = api.organization.listMembers.useQuery({ organizationId });
  const addMember = api.organization.addMember.useMutation();
  const updateRole = api.organization.updateMemberRole.useMutation();
  const removeMember = api.organization.removeMember.useMutation();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newRole, setNewRole] = useState<OrganizationRole>("TEACHER");
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [pendingMembershipId, setPendingMembershipId] = useState<string | null>(
    null,
  );
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const visibleMembers = (members.data ?? []).filter((member) => {
    if (!deferredSearch) return true;
    return `${member.user.name} ${member.user.email} ${member.role}`
      .toLowerCase()
      .includes(deferredSearch);
  });
  const owners = (members.data ?? []).filter(
    (member) => member.role === "OWNER",
  ).length;

  async function refreshMembers() {
    await utils.organization.listMembers.invalidate({ organizationId });
  }

  async function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const emailValue = new FormData(form).get("email");
    const email = typeof emailValue === "string" ? emailValue.trim() : "";
    if (!email) {
      toast.error("Email is required.");
      return;
    }

    try {
      await addMember.mutateAsync({ organizationId, email, role: newRole });
      await refreshMembers();
      form.reset();
      setNewRole("TEACHER");
      setAddOpen(false);
      toast.success("Member added to the organization.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function handleRoleChange(member: Member, role: OrganizationRole) {
    if (role === member.role) return;
    setPendingMembershipId(member.id);
    try {
      await updateRole.mutateAsync({
        organizationId,
        membershipId: member.id,
        role,
      });
      await refreshMembers();
      toast.success(`${member.user.name} is now ${roleDetails[role].label}.`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPendingMembershipId(null);
    }
  }

  async function handleRemoveMember() {
    if (!memberToRemove) return;
    setPendingMembershipId(memberToRemove.id);
    try {
      await removeMember.mutateAsync({
        organizationId,
        membershipId: memberToRemove.id,
      });
      await refreshMembers();
      toast.success(`${memberToRemove.user.name} was removed.`);
      setMemberToRemove(null);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPendingMembershipId(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
            <UsersIcon className="size-4" />
            Organization access
          </div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Members
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm">
            Assign access deliberately. Owners control the organization, admins
            manage operations, and teachers manage their learning spaces.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <UserPlusIcon data-icon="inline-start" />
          Add member
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardDescription>Total members</CardDescription>
            <CardTitle className="text-2xl">
              {members.data?.length ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Owners</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              {owners}
              <CrownIcon className="size-4 text-amber-600" />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Your access</CardDescription>
            <CardTitle className="text-2xl">
              {roleDetails[currentRole].label}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-4">
          <CardTitle>Member directory</CardTitle>
          <CardDescription>
            {members.data?.length ?? 0} people with organization access
          </CardDescription>
          <div className="relative col-span-full mt-3 sm:max-w-sm">
            <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email, or role"
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {members.isPending ? (
            <div className="text-muted-foreground flex min-h-56 items-center justify-center">
              <LoaderCircleIcon className="mr-2 size-4 animate-spin" />
              Loading members
            </div>
          ) : members.error ? (
            <div className="flex min-h-56 flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-destructive text-sm">
                {members.error.message}
              </p>
              <Button variant="outline" onClick={() => members.refetch()}>
                Try again
              </Button>
            </div>
          ) : visibleMembers.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center gap-2 p-6 text-center">
              <UsersIcon className="text-muted-foreground/60 size-8" />
              <p className="font-medium">No members found</p>
              <p className="text-muted-foreground text-sm">
                Try a different name, email, or role.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {visibleMembers.map((member) => {
                const isCurrentMember = member.id === currentMembershipId;
                const isOwnerProtected =
                  currentRole !== "OWNER" && member.role === "OWNER";
                const isPending = pendingMembershipId === member.id;

                return (
                  <div
                    key={member.id}
                    className="hover:bg-muted/30 grid gap-4 p-4 transition-colors sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar size="lg">
                        {member.user.image ? (
                          <AvatarImage
                            src={member.user.image}
                            alt={member.user.name}
                          />
                        ) : null}
                        <AvatarFallback>
                          {initials(member.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-medium">
                            {member.user.name}
                          </p>
                          {isCurrentMember ? (
                            <Badge variant="secondary">You</Badge>
                          ) : null}
                        </div>
                        <p className="text-muted-foreground truncate text-sm">
                          {member.user.email}
                        </p>
                      </div>
                    </div>

                    <Select
                      value={member.role}
                      disabled={isPending || isOwnerProtected}
                      onValueChange={(value) => {
                        if (value) {
                          void handleRoleChange(member, value);
                        }
                      }}
                    >
                      <SelectTrigger className="w-full sm:w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          value="OWNER"
                          disabled={currentRole !== "OWNER"}
                        >
                          Owner
                        </SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="TEACHER">Teacher</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={member.role === "OWNER" || isPending}
                      onClick={() => setMemberToRemove(member)}
                      aria-label={`Remove ${member.user.name}`}
                    >
                      {isPending ? (
                        <LoaderCircleIcon className="animate-spin" />
                      ) : (
                        <Trash2Icon />
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <form onSubmit={handleAddMember} className="contents">
            <DialogHeader>
              <DialogTitle>Add organization member</DialogTitle>
              <DialogDescription>
                Enter the email from their Hakgyo account and choose their
                starting access level.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="member-email">Email address</Label>
                <Input
                  id="member-email"
                  name="email"
                  type="email"
                  placeholder="member@example.com"
                  autoComplete="email"
                  autoFocus
                  required
                />
                <p className="text-muted-foreground text-xs">
                  The user must already have a Hakgyo account.
                </p>
              </div>
              <div className="grid gap-2">
                <Label>Role</Label>
                <Select
                  value={newRole}
                  onValueChange={(value) => {
                    if (value) setNewRole(value);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currentRole === "OWNER" ? (
                      <SelectItem value="OWNER">Owner</SelectItem>
                    ) : null}
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="TEACHER">Teacher</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  {roleDetails[newRole].description}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addMember.isPending}>
                {addMember.isPending ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : (
                  <UserPlusIcon />
                )}
                Add member
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={memberToRemove !== null}
        onOpenChange={(open) => {
          if (!open && !removeMember.isPending) setMemberToRemove(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <ShieldCheckIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Remove organization access?</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToRemove?.user.name} will lose access to this organization.
              Their account and learning history will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMember.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={removeMember.isPending}
              onClick={() => void handleRemoveMember()}
            >
              {removeMember.isPending ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <Trash2Icon />
              )}
              Remove member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
