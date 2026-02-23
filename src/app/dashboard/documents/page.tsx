"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { DOCUMENT_CATEGORIES } from "@/lib/constants";
import { deleteDocumentAction, initialActionState, uploadDocumentAction } from "@/server/actions";
import type { ActionState } from "@/server/actions";
import { TokenField } from "@/components/auth/token-field";
import { ActionMessage } from "@/components/ui/action-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Select } from "@/components/ui/field";
import { useSupabase } from "@/hooks/use-supabase";
import { useUserContext } from "@/hooks/use-user-context";
import { formatDateTime } from "@/lib/utils";
import type { Database } from "@/types/database";

type Application = Database["public"]["Tables"]["applications"]["Row"];
type Document = Database["public"]["Tables"]["documents"]["Row"];

function useReloadOnSuccess(state: ActionState, reload: () => void) {
  useEffect(() => {
    if (state.status === "success") reload();
  }, [state, reload]);
}

function DeleteDocumentForm({ documentId, applicationId, onDone }: { documentId: string; applicationId: string | null; onDone: () => void }) {
  const [state, action, pending] = useActionState(deleteDocumentAction, initialActionState);
  useReloadOnSuccess(state, onDone);

  return (
    <form action={action} className="flex items-center gap-2">
      <TokenField />
      <input type="hidden" name="document_id" value={documentId} />
      <input type="hidden" name="application_id" value={applicationId ?? ""} />
      <Button size="sm" variant="ghost" type="submit" disabled={pending}>
        Delete
      </Button>
      <ActionMessage state={state} />
    </form>
  );
}

export default function DocumentsPage() {
  const supabase = useSupabase();
  const { userId, loading } = useUserContext();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [applicationFilter, setApplicationFilter] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [downloadBusyId, setDownloadBusyId] = useState("");

  const [uploadState, uploadAction, uploadPending] = useActionState(uploadDocumentAction, initialActionState);
  useReloadOnSuccess(uploadState, loadData);

  async function loadData() {
    if (!userId) return;
    setIsLoading(true);
    setError("");

    const [docsRes, appsRes] = await Promise.all([
      supabase.from("documents").select("*").order("created_at", { ascending: false }),
      supabase.from("applications").select("*").order("company_name", { ascending: true }),
    ]);

    if (docsRes.error || appsRes.error) {
      setError(docsRes.error?.message ?? appsRes.error?.message ?? "Could not load documents.");
      setIsLoading(false);
      return;
    }

    setDocuments(docsRes.data ?? []);
    setApplications(appsRes.data ?? []);
    setIsLoading(false);
  }

  useEffect(() => {
    if (loading || !userId) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, userId]);

  const filtered = useMemo(() => {
    return documents.filter((document) => {
      if (categoryFilter && document.category !== categoryFilter) return false;
      if (applicationFilter && document.application_id !== applicationFilter) return false;
      return true;
    });
  }, [documents, categoryFilter, applicationFilter]);

  async function openDownload(document: Document) {
    setDownloadBusyId(document.id);
    const { data, error: signedUrlError } = await supabase.storage
      .from(document.storage_bucket)
      .createSignedUrl(document.storage_path, 90);

    setDownloadBusyId("");

    if (signedUrlError || !data?.signedUrl) {
      setError(signedUrlError?.message ?? "Could not generate download URL.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-stone-900">Documents library</h1>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardTitle>Upload document</CardTitle>
          <form action={uploadAction} className="mt-4 space-y-3">
            <TokenField />
            <div>
              <Label>Attach to application</Label>
              <Select name="application_id" defaultValue="">
                <option value="">None</option>
                {applications.map((application) => (
                  <option key={application.id} value={application.id}>
                    {application.company_name} · {application.role_title}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select name="category" defaultValue="other">
                {DOCUMENT_CATEGORIES.map((category) => (
                  <option value={category} key={category}>{category.replace("_", " ")}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Version label</Label>
              <Input name="version_label" placeholder="CV v3" />
            </div>
            <div>
              <Label>File</Label>
              <Input type="file" name="file" required />
            </div>

            <Button type="submit" disabled={uploadPending}>Upload</Button>
            <ActionMessage state={uploadState} />
          </form>
        </Card>

        <Card className="xl:col-span-2">
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="w-full sm:w-48">
              <Label>Filter by category</Label>
              <Select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                <option value="">All</option>
                {DOCUMENT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>{category.replace("_", " ")}</option>
                ))}
              </Select>
            </div>

            <div className="w-full sm:w-64">
              <Label>Filter by application</Label>
              <Select value={applicationFilter} onChange={(event) => setApplicationFilter(event.target.value)}>
                <option value="">All</option>
                {applications.map((application) => (
                  <option key={application.id} value={application.id}>
                    {application.company_name} · {application.role_title}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {isLoading ? (
            <p className="text-sm text-stone-600">Loading documents...</p>
          ) : filtered.length === 0 ? (
            <EmptyState title="No documents" description="Upload CVs, cover letters, and portfolio files to build your version history." />
          ) : (
            <div className="space-y-2">
              {filtered.map((document) => {
                const relatedApplication = applications.find((application) => application.id === document.application_id);
                return (
                  <div key={document.id} className="rounded-md border border-stone-200 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-stone-900">{document.file_name}</p>
                        <p className="mt-1 text-xs text-stone-600">
                          {relatedApplication
                            ? `${relatedApplication.company_name} · ${relatedApplication.role_title}`
                            : "Unlinked document"}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge className="border-stone-200 bg-stone-100 text-stone-700">{document.category.replace("_", " ")}</Badge>
                          {document.version_label && (
                            <Badge className="border-blue-200 bg-blue-100 text-blue-700">{document.version_label}</Badge>
                          )}
                          <Badge className="border-stone-200 bg-white text-stone-600">{formatDateTime(document.created_at)}</Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openDownload(document)}
                          disabled={downloadBusyId === document.id}
                        >
                          {downloadBusyId === document.id ? "Preparing..." : "Download"}
                        </Button>
                        <DeleteDocumentForm
                          documentId={document.id}
                          applicationId={document.application_id}
                          onDone={loadData}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
