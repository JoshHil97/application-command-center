"use client";

import Link from "next/link";
import { Fragment, useActionState, useEffect, useMemo, useState } from "react";
import {
  APP_STATUSES,
  DOCUMENT_CATEGORIES,
  NOTE_KINDS,
  PRIORITIES,
  WORK_MODES,
} from "@/lib/constants";
import {
  formatDate,
  priorityClass,
  statusClass,
  statusLabel,
  toInputDate,
} from "@/lib/utils";
import { useSupabase } from "@/hooks/use-supabase";
import { useUserContext } from "@/hooks/use-user-context";
import {
  bulkUpdateApplicationsAction,
  createNoteAction,
  initialActionState,
  setNextStepAction,
  updateApplicationStatusAction,
  uploadDocumentAction,
} from "@/server/actions";
import type { ActionState } from "@/server/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { ActionMessage } from "@/components/ui/action-message";
import { TokenField } from "@/components/auth/token-field";
import type { Database } from "@/types/database";

type Application = Database["public"]["Tables"]["applications"]["Row"];

function useReloadOnSuccess(state: ActionState, onSuccess: () => void) {
  useEffect(() => {
    if (state.status === "success") {
      onSuccess();
    }
  }, [state, onSuccess]);
}

function StatusQuickForm({ applicationId, currentStatus, onDone }: { applicationId: string; currentStatus: string; onDone: () => void }) {
  const [state, action, pending] = useActionState(updateApplicationStatusAction, initialActionState);
  useReloadOnSuccess(state, onDone);

  return (
    <form action={action} className="flex items-end gap-2">
      <TokenField />
      <input type="hidden" name="application_id" value={applicationId} />
      <div className="w-full sm:w-40">
        <Label>Status</Label>
        <Select name="status" defaultValue={currentStatus}>
          {APP_STATUSES.map((status) => (
            <option value={status} key={status}>
              {statusLabel(status)}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        Update
      </Button>
      <ActionMessage state={state} />
    </form>
  );
}

function NextStepQuickForm({
  application,
  onDone,
}: {
  application: Application;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(setNextStepAction, initialActionState);
  useReloadOnSuccess(state, onDone);

  return (
    <form action={action} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
      <TokenField />
      <input type="hidden" name="application_id" value={application.id} />
      <div>
        <Label>Next step date</Label>
        <Input name="next_step_date" type="date" defaultValue={toInputDate(application.next_step_date)} />
      </div>
      <div>
        <Label>Next step note</Label>
        <Input name="next_step_note" defaultValue={application.next_step_note ?? ""} placeholder="Follow up with recruiter" />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        Save
      </Button>
      <ActionMessage state={state} />
    </form>
  );
}

function NoteQuickForm({ applicationId, onDone }: { applicationId: string; onDone: () => void }) {
  const [state, action, pending] = useActionState(createNoteAction, initialActionState);
  useReloadOnSuccess(state, onDone);

  return (
    <form action={action} className="grid gap-2 sm:grid-cols-[180px_1fr_auto] sm:items-end">
      <TokenField />
      <input type="hidden" name="application_id" value={applicationId} />
      <div>
        <Label>Note type</Label>
        <Select name="kind" defaultValue="general">
          {NOTE_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {kind.replace("_", " ")}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Note</Label>
        <Textarea name="content" rows={2} placeholder="Add follow-up context" required />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        Add note
      </Button>
      <ActionMessage state={state} />
    </form>
  );
}

function UploadQuickForm({ application, onDone }: { application: Application; onDone: () => void }) {
  const [state, action, pending] = useActionState(uploadDocumentAction, initialActionState);
  useReloadOnSuccess(state, onDone);

  return (
    <form action={action} className="grid gap-2 sm:grid-cols-[130px_180px_1fr_auto] sm:items-end">
      <TokenField />
      <input type="hidden" name="application_id" value={application.id} />
      <input type="hidden" name="company_id" value={application.company_id ?? ""} />
      <div>
        <Label>Category</Label>
        <Select name="category" defaultValue="other">
          {DOCUMENT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category.replace("_", " ")}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Version label</Label>
        <Input name="version_label" placeholder="CV v3" />
      </div>
      <div>
        <Label>File</Label>
        <Input name="file" type="file" required />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        Upload
      </Button>
      <ActionMessage state={state} />
    </form>
  );
}

function BulkActionForm({ selectedIds, onDone }: { selectedIds: string[]; onDone: () => void }) {
  const [status, setStatus] = useState("rejected");
  const [state, action, pending] = useActionState(bulkUpdateApplicationsAction, initialActionState);
  useReloadOnSuccess(state, onDone);

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <TokenField />
      <input type="hidden" name="application_ids" value={selectedIds.join(",")} />

      <div className="w-44">
        <Label>Bulk status</Label>
        <Select value={status} onChange={(event) => setStatus(event.target.value)}>
          {APP_STATUSES.map((item) => (
            <option key={item} value={item}>
              {statusLabel(item)}
            </option>
          ))}
        </Select>
      </div>

      <input type="hidden" name="status" value={status} />

      <Button type="submit" size="sm" disabled={pending || selectedIds.length === 0}>
        Apply to selected ({selectedIds.length})
      </Button>
      <ActionMessage state={state} />
    </form>
  );
}

export default function ApplicationsPage() {
  const supabase = useSupabase();
  const { userId, loading } = useUserContext();

  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [workModeFilter, setWorkModeFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [upcomingOnly, setUpcomingOnly] = useState(false);
  const [sort, setSort] = useState("date_applied_desc");

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function loadApplications() {
    if (!userId) return;

    setIsLoading(true);
    setError("");

    let query = supabase.from("applications").select("*");

    if (search.trim()) {
      const q = search.trim();
      query = query.or(`company_name.ilike.%${q}%,role_title.ilike.%${q}%`);
    }

    if (statusFilter) query = query.eq("status", statusFilter as never);
    if (priorityFilter) query = query.eq("priority", priorityFilter as never);
    if (workModeFilter) query = query.eq("work_mode", workModeFilter as never);
    if (startDate) query = query.gte("date_applied", startDate);
    if (endDate) query = query.lte("date_applied", endDate);
    if (upcomingOnly) query = query.not("next_step_date", "is", null);

    if (sort === "next_step_date_asc") {
      query = query.order("next_step_date", { ascending: true, nullsFirst: false });
    } else {
      query = query.order("date_applied", { ascending: false });
    }

    const { data, error: fetchError } = await query.limit(500);

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setApplications(data ?? []);
    }

    setIsLoading(false);
  }

  useEffect(() => {
    if (loading || !userId) return;
    loadApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    loading,
    userId,
    search,
    statusFilter,
    priorityFilter,
    workModeFilter,
    startDate,
    endDate,
    upcomingOnly,
    sort,
  ]);

  const selectedIds = useMemo(
    () => Object.keys(selected).filter((id) => selected[id]),
    [selected],
  );

  function toggleSelected(id: string, checked: boolean) {
    setSelected((prev) => ({ ...prev, [id]: checked }));
  }

  function exportCsv() {
    if (!applications.length) return;

    const headers = [
      "company_name",
      "role_title",
      "status",
      "priority",
      "date_applied",
      "next_step_date",
      "updated_at",
    ];

    const rows = applications.map((app) =>
      [
        app.company_name,
        app.role_title,
        app.status,
        app.priority,
        app.date_applied,
        app.next_step_date ?? "",
        app.updated_at,
      ]
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(","),
    );

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `applications-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-stone-900">Applications</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={exportCsv}>Export CSV</Button>
          <Link href="/dashboard/applications/new">
            <Button>New application</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardTitle>Filters</CardTitle>
        <div className="mt-4 grid gap-3 md:grid-cols-3 lg:grid-cols-4">
          <div>
            <Label>Search</Label>
            <Input
              placeholder="Company or role"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div>
            <Label>Status</Label>
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">All</option>
              {APP_STATUSES.map((status) => (
                <option key={status} value={status}>{statusLabel(status)}</option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Priority</Label>
            <Select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
              <option value="">All</option>
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>{priority}</option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Work mode</Label>
            <Select value={workModeFilter} onChange={(event) => setWorkModeFilter(event.target.value)}>
              <option value="">All</option>
              {WORK_MODES.map((mode) => (
                <option key={mode} value={mode}>{mode}</option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Date from</Label>
            <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </div>

          <div>
            <Label>Date to</Label>
            <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </div>

          <div>
            <Label>Sort</Label>
            <Select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="date_applied_desc">Date applied (newest)</option>
              <option value="next_step_date_asc">Next step date (soonest)</option>
            </Select>
          </div>

          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={upcomingOnly}
                onChange={(event) => setUpcomingOnly(event.target.checked)}
              />
              Only with next step date
            </label>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Bulk actions</CardTitle>
          <BulkActionForm selectedIds={selectedIds} onDone={loadApplications} />
        </div>

        {isLoading ? (
          <p className="text-sm text-stone-600">Loading applications...</p>
        ) : applications.length === 0 ? (
          <EmptyState title="No applications found" description="Adjust filters or create a new application." />
        ) : (
          <>
            <div className="space-y-3 lg:hidden">
              {applications.map((app) => {
                const expanded = expandedId === app.id;

                return (
                  <div key={app.id} className="rounded-lg border border-stone-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <label className="inline-flex items-center gap-2 text-xs text-stone-600">
                        <input
                          type="checkbox"
                          checked={!!selected[app.id]}
                          onChange={(event) => toggleSelected(app.id, event.target.checked)}
                        />
                        Select
                      </label>
                      <Badge className={statusClass(app.status)}>{statusLabel(app.status)}</Badge>
                    </div>

                    <p className="mt-2 text-sm font-medium text-stone-900">{app.company_name}</p>
                    <Link href={`/dashboard/applications/${app.id}`} className="mt-1 block text-sm text-stone-700 hover:text-stone-800">
                      {app.role_title}
                    </Link>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-stone-600">
                      <div>
                        <span className="block font-medium text-stone-700">Priority</span>
                        <Badge className={`${priorityClass(app.priority)} mt-1`}>{app.priority}</Badge>
                      </div>
                      <div>
                        <span className="block font-medium text-stone-700">Applied</span>
                        <span className="mt-1 block">{formatDate(app.date_applied)}</span>
                      </div>
                      <div>
                        <span className="block font-medium text-stone-700">Next step</span>
                        <span className="mt-1 block">{formatDate(app.next_step_date)}</span>
                      </div>
                      <div>
                        <span className="block font-medium text-stone-700">Updated</span>
                        <span className="mt-1 block">{formatDate(app.updated_at)}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link href={`/dashboard/applications/${app.id}`}>
                        <Button size="sm" variant="secondary">View</Button>
                      </Link>
                      <Button size="sm" variant="ghost" onClick={() => setExpandedId(expanded ? null : app.id)}>
                        {expanded ? "Hide" : "Quick actions"}
                      </Button>
                    </div>

                    {expanded && (
                      <div className="mt-3 space-y-3 border-t border-stone-200 pt-3">
                        <StatusQuickForm
                          applicationId={app.id}
                          currentStatus={app.status}
                          onDone={loadApplications}
                        />
                        <NextStepQuickForm application={app} onDone={loadApplications} />
                        <NoteQuickForm applicationId={app.id} onDone={loadApplications} />
                        <UploadQuickForm application={app} onDone={loadApplications} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-left text-xs uppercase tracking-wide text-stone-500">
                    <th className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.length > 0 && selectedIds.length === applications.length}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          const next: Record<string, boolean> = {};
                          for (const app of applications) {
                            next[app.id] = checked;
                          }
                          setSelected(next);
                        }}
                      />
                    </th>
                    <th className="px-2 py-2">Company</th>
                    <th className="px-2 py-2">Role</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Priority</th>
                    <th className="px-2 py-2">Date applied</th>
                    <th className="px-2 py-2">Next step</th>
                    <th className="px-2 py-2">Updated</th>
                    <th className="px-2 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => {
                    const expanded = expandedId === app.id;

                    return (
                      <Fragment key={app.id}>
                        <tr className="border-b border-stone-100 align-top">
                          <td className="px-2 py-3">
                            <input
                              type="checkbox"
                              checked={!!selected[app.id]}
                              onChange={(event) => toggleSelected(app.id, event.target.checked)}
                            />
                          </td>
                          <td className="px-2 py-3 font-medium text-stone-900">{app.company_name}</td>
                          <td className="px-2 py-3">
                            <Link href={`/dashboard/applications/${app.id}`} className="text-stone-700 hover:text-stone-800">
                              {app.role_title}
                            </Link>
                          </td>
                          <td className="px-2 py-3">
                            <Badge className={statusClass(app.status)}>{statusLabel(app.status)}</Badge>
                          </td>
                          <td className="px-2 py-3">
                            <Badge className={priorityClass(app.priority)}>{app.priority}</Badge>
                          </td>
                          <td className="px-2 py-3 text-stone-700">{formatDate(app.date_applied)}</td>
                          <td className="px-2 py-3 text-stone-700">{formatDate(app.next_step_date)}</td>
                          <td className="px-2 py-3 text-stone-700">{formatDate(app.updated_at)}</td>
                          <td className="px-2 py-3">
                            <div className="flex items-center gap-2">
                              <Link href={`/dashboard/applications/${app.id}`}>
                                <Button size="sm" variant="secondary">View</Button>
                              </Link>
                              <Button size="sm" variant="ghost" onClick={() => setExpandedId(expanded ? null : app.id)}>
                                {expanded ? "Hide" : "Quick actions"}
                              </Button>
                            </div>
                          </td>
                        </tr>

                        {expanded && (
                          <tr key={`${app.id}-expanded`} className="border-b border-stone-200 bg-stone-50/80">
                            <td colSpan={9} className="space-y-3 px-2 py-4">
                              <StatusQuickForm
                                applicationId={app.id}
                                currentStatus={app.status}
                                onDone={loadApplications}
                              />
                              <NextStepQuickForm application={app} onDone={loadApplications} />
                              <NoteQuickForm applicationId={app.id} onDone={loadApplications} />
                              <UploadQuickForm application={app} onDone={loadApplications} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
