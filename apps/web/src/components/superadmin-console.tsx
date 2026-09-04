"use client";

import { useState, type ReactNode } from "react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { api, type RouterOutputs } from "~/trpc/react";

type Dashboard = RouterOutputs["superadmin"]["dashboard"];
type User = Dashboard["users"]["items"][number];

export function SuperadminConsole({ initialData }: { initialData: Dashboard }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<User | null>(null);
  const users = api.superadmin.listUsers.useQuery(
    { search, page },
    {
      initialData: search || page !== 1 ? undefined : initialData.users,
    },
  );
  const utils = api.useUtils();
  const updateProfile = api.superadmin.updateProfile.useMutation({
    onSuccess: () => {
      setEditing(null);
      void utils.superadmin.listUsers.invalidate();
    },
  });
  const setSuspended = api.superadmin.setSuspended.useMutation({
    onSuccess: () => void utils.superadmin.listUsers.invalidate(),
  });
  const softDelete = api.superadmin.softDelete.useMutation({
    onSuccess: () => void utils.superadmin.listUsers.invalidate(),
  });
  const revokeSessions = api.superadmin.revokeSessions.useMutation();
  const organizations = api.superadmin.listOrganizations.useQuery();
  const courses = api.superadmin.listCourses.useQuery();
  const deleteCourse = api.superadmin.deleteCourse.useMutation({
    onSuccess: () => void utils.superadmin.listCourses.invalidate(),
  });
  const deleteOrganization = api.superadmin.deleteOrganization.useMutation({
    onSuccess: () => {
      void utils.superadmin.listOrganizations.invalidate();
      void utils.superadmin.listCourses.invalidate();
    },
  });

  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 px-6 py-10">
      <header className="border-b pb-8">
        <p className="text-muted-foreground text-xs font-semibold tracking-[0.2em] uppercase">
          Restricted operations
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          Superadmin
        </h1>
        <p className="text-muted-foreground mt-3 max-w-2xl">
          Account operations and sign-in visibility. Every mutation is recorded.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <Metric label="Users" value={initialData.metrics.users} />
        <Metric
          label="Sign-ins · last 24 hours"
          value={initialData.metrics.recentSignIns}
        />
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <ResourceList
          title="Courses"
          empty="No courses"
          items={courses.data ?? []}
          render={(course) => (
            <ResourceRow
              key={course.id}
              label={course.title}
              detail={`${course.organization.name} · ${course._count.modules} modules · ${course._count.cohorts} cohorts`}
              onDelete={() => {
                if (
                  window.prompt(
                    `Type “${course.title}” to delete this course`,
                  ) === course.title
                ) {
                  deleteCourse.mutate({ courseId: course.id });
                }
              }}
            />
          )}
        />
        <ResourceList
          title="Organizations"
          empty="No organizations"
          items={organizations.data ?? []}
          render={(organization) => (
            <ResourceRow
              key={organization.id}
              label={organization.name}
              detail={`${organization._count.members} members · ${organization._count.courses} courses`}
              onDelete={() => {
                if (
                  window.prompt(
                    `Type “${organization.name}” to delete this organization`,
                  ) === organization.name
                ) {
                  deleteOrganization.mutate({
                    organizationId: organization.id,
                  });
                }
              }}
            />
          )}
        />
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Users</h2>
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search name or email"
            className="max-w-sm"
          />
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Sessions</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.data?.items.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  onEdit={() => setEditing(user)}
                  onSuspend={() =>
                    setSuspended.mutate({
                      userId: user.id,
                      suspended: !user.suspendedAt,
                    })
                  }
                  onDelete={() => softDelete.mutate({ userId: user.id })}
                  onRevoke={() => revokeSessions.mutate({ userId: user.id })}
                />
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            {users.data?.total ?? 0} matching users
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={
                !users.data || page * users.data.pageSize >= users.data.total
              }
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </section>

      {editing ? (
        <form
          className="bg-background fixed inset-x-4 bottom-4 z-10 mx-auto max-w-lg space-y-4 rounded-lg border p-5 shadow-xl"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const name = form.get("name");
            const image = form.get("image");
            if (
              typeof name !== "string" ||
              (image !== null && typeof image !== "string")
            ) {
              return;
            }
            updateProfile.mutate({
              userId: editing.id,
              name,
              image: image ?? null,
            });
          }}
        >
          <h2 className="text-lg font-semibold">Edit profile</h2>
          <Input name="name" defaultValue={editing.name} aria-label="Name" />
          <Input
            name="image"
            defaultValue={editing.image ?? ""}
            aria-label="Image URL"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditing(null)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateProfile.isPending}>
              Save
            </Button>
          </div>
        </form>
      ) : null}
    </main>
  );
}

function ResourceList<T>({
  title,
  empty,
  items,
  render,
}: {
  title: string;
  empty: string;
  items: T[];
  render: (item: T) => ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="divide-y rounded-lg border">
        {items.length ? (
          items.map(render)
        ) : (
          <p className="text-muted-foreground p-4 text-sm">{empty}</p>
        )}
      </div>
    </section>
  );
}

function ResourceRow({
  label,
  detail,
  onDelete,
}: {
  label: string;
  detail: string;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <div className="min-w-0">
        <p className="truncate font-medium">{label}</p>
        <p className="text-muted-foreground truncate text-sm">{detail}</p>
      </div>
      <Button variant="destructive" size="sm" onClick={onDelete}>
        Delete tree
      </Button>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-5">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function UserRow({
  user,
  onEdit,
  onSuspend,
  onDelete,
  onRevoke,
}: {
  user: User;
  onEdit: () => void;
  onSuspend: () => void;
  onDelete: () => void;
  onRevoke: () => void;
}) {
  const status = user.deletedAt
    ? "Deleted"
    : user.suspendedAt
      ? "Suspended"
      : "Active";
  return (
    <tr>
      <td className="px-4 py-4">
        <div className="font-medium">{user.name}</div>
        <div className="text-muted-foreground">{user.email}</div>
      </td>
      <td className="px-4 py-4">{status}</td>
      <td className="px-4 py-4">{user._count.sessions}</td>
      <td className="px-4 py-4">
        <div className="flex flex-wrap justify-end gap-2">
          <Button size="sm" variant="outline" onClick={onEdit}>
            Edit
          </Button>
          {!user.deletedAt ? (
            <Button size="sm" variant="outline" onClick={onSuspend}>
              {user.suspendedAt ? "Restore" : "Suspend"}
            </Button>
          ) : null}
          <Button size="sm" variant="outline" onClick={onRevoke}>
            Revoke sessions
          </Button>
          {!user.deletedAt ? (
            <Button size="sm" variant="destructive" onClick={onDelete}>
              Delete
            </Button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
