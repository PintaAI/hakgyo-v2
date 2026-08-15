"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  KeyRoundIcon,
  MonitorSmartphoneIcon,
  ShieldAlertIcon,
  UserRoundIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
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
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "~/components/ui/sidebar";
import {
  MAX_PROFILE_IMAGE_SIZE,
  profileImageContentTypes,
  type ProfileImageContentType,
} from "~/lib/profile-image";
import { authClient } from "~/server/better-auth/client";
import { api } from "~/trpc/react";

type LinkedAccount = {
  id: string;
  accountId: string;
  providerId: string;
  createdAt: Date;
};

type UserSession = {
  token: string;
  createdAt: Date;
  expiresAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
};

type AccountSection = "profile" | "security" | "sessions" | "danger";

const accountSections = [
  { value: "profile", label: "Profile", icon: UserRoundIcon },
  { value: "security", label: "Security", icon: KeyRoundIcon },
  { value: "sessions", label: "Sessions", icon: MonitorSmartphoneIcon },
  { value: "danger", label: "Danger zone", icon: ShieldAlertIcon },
] as const;

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

function providerName(providerId: string) {
  return providerId === "credential"
    ? "Email and password"
    : providerId.charAt(0).toUpperCase() + providerId.slice(1);
}

export function AccountSettings({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { data: session, refetch: refetchSession } = authClient.useSession();
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [section, setSection] = useState<AccountSection>("profile");
  const deletionBlockers = api.account.deletionBlockers.useQuery(undefined, {
    enabled: open,
  });
  const utils = api.useUtils();
  const updateProfile = api.account.updateProfile.useMutation();
  const createImageUpload =
    api.storage.createProfileImageUploadUrl.useMutation();
  const confirmImageUpload =
    api.storage.confirmProfileImageUpload.useMutation();
  const discardImageUpload =
    api.storage.discardProfileImageUpload.useMutation();
  const deleteProfileImage = api.storage.deleteProfileImage.useMutation();

  useEffect(() => {
    if (!open) return;
    let active = true;
    void Promise.all([
      authClient.listAccounts(),
      authClient.listSessions(),
    ]).then(([accountResult, sessionResult]) => {
      if (!active) return;
      if (accountResult.data) setAccounts(accountResult.data);
      if (sessionResult.data) setSessions(sessionResult.data);
    });
    return () => {
      active = false;
    };
  }, [open]);

  const hasCredential = accounts.some(
    (account) => account.providerId === "credential",
  );
  const isBusy = pendingAction !== null;
  const email = session?.user.email ?? "";
  const blockers = deletionBlockers.data ?? [];

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nameValue = formData.get("name");
    const trimmedName = typeof nameValue === "string" ? nameValue.trim() : "";
    if (!trimmedName) {
      toast.error("Name is required.");
      return;
    }

    setPendingAction("profile");
    try {
      await updateProfile.mutateAsync({ name: trimmedName });
      await Promise.all([refetchSession(), utils.account.me.invalidate()]);
      toast.success("Profile updated.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPendingAction(null);
    }
  }

  async function uploadProfileImage() {
    if (!profileImage) {
      toast.error("Choose an image first.");
      return;
    }
    if (profileImage.size > MAX_PROFILE_IMAGE_SIZE) {
      toast.error("Profile images must be 5 MB or smaller.");
      return;
    }
    if (
      !profileImageContentTypes.includes(
        profileImage.type as ProfileImageContentType,
      )
    ) {
      toast.error("Use a JPEG, PNG, WebP, or GIF image.");
      return;
    }

    let uploadedKey: string | null = null;
    setPendingAction("profile-image");
    try {
      const upload = await createImageUpload.mutateAsync({
        contentType: profileImage.type as ProfileImageContentType,
        fileSize: profileImage.size,
      });
      uploadedKey = upload.key;
      const response = await fetch(upload.uploadUrl, {
        method: "PUT",
        body: profileImage,
        headers: upload.headers,
      });
      if (!response.ok) {
        throw new Error(`Image upload failed (${response.status}).`);
      }

      await confirmImageUpload.mutateAsync({ key: upload.key });
      uploadedKey = null;
      await Promise.all([refetchSession(), utils.account.me.invalidate()]);
      setProfileImage(null);
      toast.success("Profile image updated.");
    } catch (error) {
      if (uploadedKey) {
        try {
          await discardImageUpload.mutateAsync({ key: uploadedKey });
        } catch {
          // Bucket lifecycle cleanup handles uploads that cannot be discarded.
        }
      }
      toast.error(errorMessage(error));
    } finally {
      setPendingAction(null);
    }
  }

  async function removeProfileImage() {
    setPendingAction("remove-profile-image");
    try {
      await deleteProfileImage.mutateAsync();
      await Promise.all([refetchSession(), utils.account.me.invalidate()]);
      setProfileImage(null);
      toast.success("Profile image removed.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPendingAction(null);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword.length < 8) {
      toast.error("The new password must contain at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("The new passwords do not match.");
      return;
    }
    if (currentPassword === newPassword) {
      toast.error("Choose a password different from your current password.");
      return;
    }

    setPendingAction("password");
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (result.error) throw new Error(errorMessage(result.error));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      const refreshed = await authClient.listSessions();
      if (refreshed.data) setSessions(refreshed.data);
      toast.success("Password changed. Other sessions were signed out.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPendingAction(null);
    }
  }

  async function revokeSession(token: string) {
    setPendingAction(`session:${token}`);
    try {
      const result = await authClient.revokeSession({ token });
      if (result.error) throw new Error(errorMessage(result.error));
      setSessions((current) =>
        current.filter((userSession) => userSession.token !== token),
      );
      toast.success("Session signed out.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPendingAction(null);
    }
  }

  async function revokeOtherSessions() {
    setPendingAction("sessions");
    try {
      const result = await authClient.revokeOtherSessions();
      if (result.error) throw new Error(errorMessage(result.error));
      setSessions((current) =>
        current.filter(
          (userSession) => userSession.token === session?.session.token,
        ),
      );
      toast.success("All other sessions were signed out.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPendingAction(null);
    }
  }

  async function unlinkProvider(account: LinkedAccount) {
    setPendingAction(`account:${account.id}`);
    try {
      const result = await authClient.unlinkAccount({
        providerId: account.providerId,
        accountId: account.accountId,
      });
      if (result.error) throw new Error(errorMessage(result.error));
      setAccounts((current) =>
        current.filter((item) => item.id !== account.id),
      );
      toast.success(`${providerName(account.providerId)} disconnected.`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPendingAction(null);
    }
  }

  async function linkGoogle() {
    setPendingAction("link-google");
    try {
      const result = await authClient.linkSocial({
        provider: "google",
        callbackURL: `${window.location.pathname}${window.location.search}`,
      });
      if (result.error) throw new Error(errorMessage(result.error));
    } catch (error) {
      toast.error(errorMessage(error));
      setPendingAction(null);
    }
  }

  async function deleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (deleteConfirmation !== email) {
      toast.error("Enter your email address exactly to confirm deletion.");
      return;
    }
    if (hasCredential && !deletePassword) {
      toast.error("Your current password is required.");
      return;
    }

    setPendingAction("delete");
    try {
      const result = await authClient.deleteUser({
        password: hasCredential ? deletePassword : undefined,
      });
      if (result.error) throw new Error(errorMessage(result.error));
      router.replace("/");
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
      setPendingAction(null);
    }
  }

  if (!session?.user) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[min(44rem,calc(100svh-2rem))] overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Profile and account</DialogTitle>
          <DialogDescription>
            Manage your profile, sign-in methods, sessions, and account.
          </DialogDescription>
        </DialogHeader>

        <SidebarProvider className="h-full min-h-0 overflow-hidden">
          <Sidebar
            className="hidden w-52 shrink-0 border-r sm:flex"
            collapsible="none"
          >
            <SidebarHeader className="border-b px-4 py-4">
              <p className="font-heading text-base font-semibold">Account</p>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Personal</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {accountSections.map((item) => (
                      <SidebarMenuItem key={item.value}>
                        <SidebarMenuButton
                          isActive={section === item.value}
                          onClick={() => setSection(item.value)}
                        >
                          <item.icon />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>

          <main className="min-w-0 flex-1 overflow-y-auto">
            <div className="border-b p-2 pr-12 sm:hidden">
              <div className="flex gap-1 overflow-x-auto">
                {accountSections.map((item) => (
                  <Button
                    key={item.value}
                    onClick={() => setSection(item.value)}
                    size="sm"
                    variant={section === item.value ? "secondary" : "ghost"}
                  >
                    <item.icon />
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-6 p-4 sm:p-7">
              {section === "profile" ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Profile</CardTitle>
                    <CardDescription>
                      Your email is {email}. Email changes require a
                      verified-email delivery flow and are not currently
                      available.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6">
                    <div className="flex flex-wrap items-center gap-4">
                      <Avatar size="lg">
                        {session.user.image ? (
                          <AvatarImage
                            src={session.user.image}
                            alt="Profile image"
                          />
                        ) : null}
                        <AvatarFallback>
                          {(session.user.name || session.user.email)
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid gap-2">
                        <Label htmlFor="account-image">Profile image</Label>
                        <Input
                          accept={profileImageContentTypes.join(",")}
                          disabled={isBusy}
                          id="account-image"
                          key={session.user.image ?? "no-profile-image"}
                          onChange={(event) =>
                            setProfileImage(event.target.files?.[0] ?? null)
                          }
                          type="file"
                        />
                        <p className="text-muted-foreground text-xs">
                          JPEG, PNG, WebP, or GIF. Maximum 5 MB.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            disabled={isBusy || !profileImage}
                            onClick={() => void uploadProfileImage()}
                            type="button"
                            variant="outline"
                          >
                            {pendingAction === "profile-image"
                              ? "Uploading..."
                              : "Upload image"}
                          </Button>
                          {session.user.image ? (
                            <Button
                              disabled={isBusy}
                              onClick={() => void removeProfileImage()}
                              type="button"
                              variant="destructive"
                            >
                              {pendingAction === "remove-profile-image"
                                ? "Removing..."
                                : "Remove image"}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <form className="grid gap-4" onSubmit={saveProfile}>
                      <div className="grid gap-2">
                        <Label htmlFor="account-name">Name</Label>
                        <Input
                          defaultValue={session.user.name}
                          id="account-name"
                          maxLength={120}
                          name="name"
                          required
                        />
                      </div>
                      <Button className="w-fit" disabled={isBusy} type="submit">
                        {pendingAction === "profile"
                          ? "Saving..."
                          : "Save profile"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              ) : null}

              {section === "security" ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Password</CardTitle>
                    <CardDescription>
                      Changing your password signs out every other device.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {hasCredential ? (
                      <form className="grid gap-4" onSubmit={changePassword}>
                        <div className="grid gap-2">
                          <Label htmlFor="current-password">
                            Current password
                          </Label>
                          <Input
                            autoComplete="current-password"
                            id="current-password"
                            onChange={(event) =>
                              setCurrentPassword(event.target.value)
                            }
                            required
                            type="password"
                            value={currentPassword}
                          />
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="grid gap-2">
                            <Label htmlFor="new-password">New password</Label>
                            <Input
                              autoComplete="new-password"
                              id="new-password"
                              minLength={8}
                              onChange={(event) =>
                                setNewPassword(event.target.value)
                              }
                              required
                              type="password"
                              value={newPassword}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="confirm-password">
                              Confirm password
                            </Label>
                            <Input
                              autoComplete="new-password"
                              id="confirm-password"
                              minLength={8}
                              onChange={(event) =>
                                setConfirmPassword(event.target.value)
                              }
                              required
                              type="password"
                              value={confirmPassword}
                            />
                          </div>
                        </div>
                        <Button
                          className="w-fit"
                          disabled={isBusy}
                          type="submit"
                        >
                          {pendingAction === "password"
                            ? "Changing..."
                            : "Change password"}
                        </Button>
                      </form>
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        This account uses a social sign-in and has no password
                        to change.
                      </p>
                    )}
                  </CardContent>
                </Card>
              ) : null}

              {section === "security" ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Sign-in methods</CardTitle>
                    <CardDescription>
                      Keep at least one sign-in method connected to your
                      account.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    {accounts.map((account) => (
                      <div
                        className="flex items-center justify-between gap-4 rounded-lg border p-3"
                        key={account.id}
                      >
                        <div>
                          <p className="font-medium">
                            {providerName(account.providerId)}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            Connected{" "}
                            {new Date(account.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        {account.providerId !== "credential" &&
                        accounts.length > 1 ? (
                          <Button
                            disabled={isBusy}
                            onClick={() => void unlinkProvider(account)}
                            type="button"
                            variant="outline"
                          >
                            Disconnect
                          </Button>
                        ) : null}
                      </div>
                    ))}
                    {!accounts.some(
                      (account) => account.providerId === "google",
                    ) ? (
                      <Button
                        className="w-fit"
                        disabled={isBusy}
                        onClick={() => void linkGoogle()}
                        type="button"
                        variant="outline"
                      >
                        Connect Google
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
              ) : null}

              {section === "sessions" ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Active sessions</CardTitle>
                    <CardDescription>
                      Sign out devices you no longer recognize or use.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    {sessions.map((userSession) => {
                      const isCurrent =
                        userSession.token === session.session.token;
                      return (
                        <div
                          className="flex items-center justify-between gap-4 rounded-lg border p-3"
                          key={userSession.token}
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {userSession.userAgent ?? "Unknown device"}
                              {isCurrent ? " (current)" : ""}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {userSession.ipAddress ?? "Unknown IP"} · expires{" "}
                              {new Date(
                                userSession.expiresAt,
                              ).toLocaleDateString()}
                            </p>
                          </div>
                          {!isCurrent ? (
                            <Button
                              disabled={isBusy}
                              onClick={() =>
                                void revokeSession(userSession.token)
                              }
                              type="button"
                              variant="outline"
                            >
                              Sign out
                            </Button>
                          ) : null}
                        </div>
                      );
                    })}
                    {sessions.length > 1 ? (
                      <Button
                        className="w-fit"
                        disabled={isBusy}
                        onClick={() => void revokeOtherSessions()}
                        type="button"
                        variant="outline"
                      >
                        Sign out all other sessions
                      </Button>
                    ) : null}
                    <Button
                      className="w-fit"
                      disabled={isBusy}
                      onClick={async () => {
                        setPendingAction("sign-out");
                        await authClient.signOut();
                        router.replace("/");
                        router.refresh();
                      }}
                      type="button"
                      variant="outline"
                    >
                      Sign out this device
                    </Button>
                  </CardContent>
                </Card>
              ) : null}

              {section === "danger" ? (
                <Card className="ring-destructive/30">
                  <CardHeader>
                    <CardTitle>Delete account</CardTitle>
                    <CardDescription>
                      Permanently removes your profile, enrollments, learning
                      progress, assessment attempts, sessions, and sign-in
                      methods. This cannot be undone.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {blockers.length > 0 ? (
                      <div className="bg-destructive/10 text-destructive mb-4 rounded-lg p-3 text-sm">
                        {blockers.map((blocker) => (
                          <p key={blocker}>{blocker}</p>
                        ))}
                      </div>
                    ) : null}
                    <form className="grid gap-4" onSubmit={deleteAccount}>
                      <div className="grid gap-2">
                        <Label htmlFor="delete-confirmation">
                          Type {email} to confirm
                        </Label>
                        <Input
                          autoComplete="off"
                          id="delete-confirmation"
                          onChange={(event) =>
                            setDeleteConfirmation(event.target.value)
                          }
                          required
                          value={deleteConfirmation}
                        />
                      </div>
                      {hasCredential ? (
                        <div className="grid gap-2">
                          <Label htmlFor="delete-password">
                            Current password
                          </Label>
                          <Input
                            autoComplete="current-password"
                            id="delete-password"
                            onChange={(event) =>
                              setDeletePassword(event.target.value)
                            }
                            required
                            type="password"
                            value={deletePassword}
                          />
                        </div>
                      ) : null}
                      <Button
                        className="w-fit"
                        disabled={
                          isBusy ||
                          deletionBlockers.isPending ||
                          blockers.length > 0 ||
                          deleteConfirmation !== email ||
                          (hasCredential && !deletePassword)
                        }
                        type="submit"
                        variant="destructive"
                      >
                        {pendingAction === "delete"
                          ? "Deleting..."
                          : "Permanently delete account"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  );
}
