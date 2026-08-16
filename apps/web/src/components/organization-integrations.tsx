"use client";

import { useState } from "react";
import {
  ExternalLinkIcon,
  LoaderCircleIcon,
  PlugZapIcon,
  UnplugIcon,
  VideoIcon,
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
import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { api } from "~/trpc/react";

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

export function OrganizationIntegrations({
  organizationId,
}: {
  organizationId: string;
}) {
  const utils = api.useUtils();
  const connection = api.organization.getZoomConnectionStatus.useQuery({
    organizationId,
  });
  const disconnect = api.organization.disconnectZoom.useMutation();
  const [disconnectOpen, setDisconnectOpen] = useState(false);

  async function handleDisconnect() {
    try {
      await disconnect.mutateAsync({ organizationId });
      await utils.organization.getZoomConnectionStatus.invalidate({
        organizationId,
      });
      setDisconnectOpen(false);
      toast.success("Zoom disconnected.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  const zoom = connection.data;
  const isConnected = zoom?.status === "CONNECTED";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="space-y-1">
        <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
          <PlugZapIcon className="size-4" />
          Connected services
        </div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Integrations
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm">
          Connect external services used to run live learning experiences.
        </p>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                <VideoIcon className="size-5" />
              </div>
              <div>
                <CardTitle>Zoom</CardTitle>
                <CardDescription>Meeting batch pembelajaran</CardDescription>
              </div>
            </div>
            {connection.isPending ? (
              <Badge variant="outline">Checking</Badge>
            ) : (
              <Badge variant={isConnected ? "default" : "secondary"}>
                {isConnected ? "Connected" : "Not connected"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {connection.isPending ? (
            <div className="text-muted-foreground flex min-h-32 items-center justify-center text-sm">
              <LoaderCircleIcon className="mr-2 size-4 animate-spin" />
              Checking connection
            </div>
          ) : connection.error ? (
            <div className="flex min-h-32 flex-col items-center justify-center gap-3 text-center">
              <p className="text-destructive text-sm">
                {connection.error.message}
              </p>
              <Button variant="outline" onClick={() => connection.refetch()}>
                Try again
              </Button>
            </div>
          ) : zoom ? (
            <div className="grid gap-5">
              <div className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Connected by
                  </p>
                  <p className="mt-1 font-medium">
                    {zoom.connectedBy.user.name}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Zoom user ID
                  </p>
                  <p className="mt-1 font-mono text-xs">{zoom.zoomUserId}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Token expires
                  </p>
                  <p className="mt-1">
                    {zoom.accessTokenExpiresAt.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Status
                  </p>
                  <p className="mt-1 capitalize">{zoom.status.toLowerCase()}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:justify-end">
                {!isConnected ? (
                  <a
                    href={`/api/integrations/zoom/connect?organizationId=${organizationId}`}
                    className={buttonVariants()}
                  >
                    <ExternalLinkIcon />
                    Reconnect Zoom
                  </a>
                ) : (
                  <Button
                    variant="destructive"
                    onClick={() => setDisconnectOpen(true)}
                  >
                    <UnplugIcon />
                    Disconnect
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex min-h-36 flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
              <div>
                <p className="font-medium">Create meetings from Hakgyo</p>
                <p className="text-muted-foreground mt-1 max-w-lg text-sm">
                  Authorize your Zoom account to create, update, and cancel
                  meeting batch pembelajaran tanpa membagikan kredensial kepada
                  anggota.
                </p>
              </div>
              <a
                href={`/api/integrations/zoom/connect?organizationId=${organizationId}`}
                className={buttonVariants()}
              >
                <ExternalLinkIcon />
                Connect Zoom
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <UnplugIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Disconnect Zoom?</AlertDialogTitle>
            <AlertDialogDescription>
              Hakgyo will revoke the stored Zoom connection. Meeting batch
              pembelajaran baru cannot be created until Zoom is connected again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disconnect.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={disconnect.isPending}
              onClick={() => void handleDisconnect()}
            >
              {disconnect.isPending ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <UnplugIcon />
              )}
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
