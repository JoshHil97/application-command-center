"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { NOTE_KINDS, TEMPLATE_TYPES } from "@/lib/constants";
import { createNoteAction, createTemplateAction, deleteTemplateAction, initialActionState } from "@/server/actions";
import type { ActionState } from "@/server/actions";
import { TokenField } from "@/components/auth/token-field";
import { ActionMessage } from "@/components/ui/action-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { useSupabase } from "@/hooks/use-supabase";
import { useUserContext } from "@/hooks/use-user-context";
import { formatDateTime } from "@/lib/utils";
import type { Database } from "@/types/database";

type Template = Database["public"]["Tables"]["templates"]["Row"];
type Application = Database["public"]["Tables"]["applications"]["Row"];

function useReloadOnSuccess(state: ActionState, reload: () => void) {
  useEffect(() => {
    if (state.status === "success") reload();
  }, [state, reload]);
}

function DeleteTemplateForm({ templateId, onDone }: { templateId: string; onDone: () => void }) {
  const [state, action, pending] = useActionState(deleteTemplateAction, initialActionState);
  useReloadOnSuccess(state, onDone);

  return (
    <form action={action}>
      <TokenField />
      <input type="hidden" name="template_id" value={templateId} />
      <Button type="submit" size="sm" variant="ghost" disabled={pending}>
        Delete
      </Button>
      <ActionMessage state={state} />
    </form>
  );
}

function TemplateToNoteForm({
  template,
  applications,
  onDone,
}: {
  template: Template;
  applications: Application[];
  onDone: () => void;
}) {
  const [kind, setKind] = useState("general");
  const [applicationId, setApplicationId] = useState("");
  const [state, action, pending] = useActionState(createNoteAction, initialActionState);
  useReloadOnSuccess(state, onDone);

  return (
    <form action={action} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <TokenField />
      <input type="hidden" name="content" value={template.content} />

      <div>
        <Label>Application</Label>
        <Select name="application_id" value={applicationId} onChange={(event) => setApplicationId(event.target.value)} required>
          <option value="">Select application</option>
          {applications.map((application) => (
            <option key={application.id} value={application.id}>
              {application.company_name} · {application.role_title}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Note kind</Label>
        <Select name="kind" value={kind} onChange={(event) => setKind(event.target.value)}>
          {NOTE_KINDS.map((item) => (
            <option key={item} value={item}>{item.replace("_", " ")}</option>
          ))}
        </Select>
      </div>
      <Button type="submit" size="sm" disabled={pending || !applicationId}>
        Add as note
      </Button>
      <ActionMessage state={state} />
    </form>
  );
}

export default function TemplatesPage() {
  const supabase = useSupabase();
  const { userId, loading } = useUserContext();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [searchTag, setSearchTag] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [createState, createAction, createPending] = useActionState(createTemplateAction, initialActionState);
  useReloadOnSuccess(createState, loadData);

  async function loadData() {
    if (!userId) return;

    setIsLoading(true);
    setError("");

    const [templatesRes, applicationsRes] = await Promise.all([
      supabase.from("templates").select("*").order("updated_at", { ascending: false }),
      supabase.from("applications").select("*").order("date_applied", { ascending: false }),
    ]);

    if (templatesRes.error || applicationsRes.error) {
      setError(templatesRes.error?.message ?? applicationsRes.error?.message ?? "Failed to load templates.");
      setIsLoading(false);
      return;
    }

    setTemplates(templatesRes.data ?? []);
    setApplications(applicationsRes.data ?? []);
    setIsLoading(false);
  }

  useEffect(() => {
    if (loading || !userId) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, userId]);

  const filtered = useMemo(() => {
    const q = searchTag.trim().toLowerCase();

    return templates.filter((template) => {
      if (typeFilter && template.type !== typeFilter) return false;
      if (!q) return true;
      return template.tags.some((tag) => tag.toLowerCase().includes(q)) || template.title.toLowerCase().includes(q);
    });
  }, [templates, searchTag, typeFilter]);

  async function copyTemplate(content: string) {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      setError("Clipboard access failed. Copy manually from the card.");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-stone-900">Template vault</h1>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardTitle>Create template</CardTitle>
          <form action={createAction} className="mt-4 space-y-3">
            <TokenField />
            <div>
              <Label>Title</Label>
              <Input name="title" required />
            </div>
            <div>
              <Label>Type</Label>
              <Select name="type" defaultValue="other">
                {TEMPLATE_TYPES.map((type) => (
                  <option key={type} value={type}>{type.replace("_", " ")}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Tags (comma-separated)</Label>
              <Input name="tags" placeholder="finance, behavioural, follow-up" />
            </div>
            <div>
              <Label>Content</Label>
              <Textarea name="content" rows={8} required />
            </div>

            <Button type="submit" disabled={createPending}>Save template</Button>
            <ActionMessage state={createState} />
          </form>
        </Card>

        <Card className="xl:col-span-2">
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="w-full sm:w-52">
              <Label>Filter type</Label>
              <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                <option value="">All</option>
                {TEMPLATE_TYPES.map((type) => (
                  <option key={type} value={type}>{type.replace("_", " ")}</option>
                ))}
              </Select>
            </div>
            <div className="w-full sm:w-60">
              <Label>Filter tags/title</Label>
              <Input value={searchTag} onChange={(event) => setSearchTag(event.target.value)} placeholder="finance, STAR, etc" />
            </div>
          </div>

          {isLoading ? (
            <p className="text-sm text-stone-600">Loading templates...</p>
          ) : filtered.length === 0 ? (
            <EmptyState title="No templates" description="Create reusable blocks for cover letters and interview answers." />
          ) : (
            <div className="space-y-3">
              {filtered.map((template) => (
                <div key={template.id} className="rounded-md border border-stone-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-stone-900">{template.title}</p>
                      <p className="mt-1 text-xs text-stone-600">{template.type.replace("_", " ")} · {formatDateTime(template.updated_at)}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {template.tags.map((tag) => (
                          <Badge key={tag} className="border-stone-200 bg-stone-100 text-stone-700">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="secondary" onClick={() => copyTemplate(template.content)}>Copy</Button>
                      <DeleteTemplateForm templateId={template.id} onDone={loadData} />
                    </div>
                  </div>

                  <pre className="mt-3 overflow-x-auto rounded-md border border-stone-200 bg-stone-50 p-3 text-xs text-stone-700 whitespace-pre-wrap">
                    {template.content}
                  </pre>

                  <TemplateToNoteForm template={template} applications={applications} onDone={loadData} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
