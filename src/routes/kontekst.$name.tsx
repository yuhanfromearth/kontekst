import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import { Label } from "#/components/ui/label";
import { Input } from "#/components/ui/input";
import { Textarea } from "#/components/ui/textarea";
import { Button } from "#/components/ui/button";
import { ShortcutCaptureInput } from "#/components/ShortcutCaptureInput";
import {
  isValidShortcut,
  SHORTCUT_HINT,
  SHORTCUT_VALIDATION_ERROR,
} from "#/lib/shortcut";
import type { KontekstDto } from "#/types/kontekst";

export const Route = createFileRoute("/kontekst/$name")({
  component: KontekstEditPage,
});

function KontekstEditPage() {
  const { name } = Route.useParams();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery<KontekstDto>({
    queryKey: ["kontekst", name],
    queryFn: () =>
      fetch(`/api/kontekst?name=${encodeURIComponent(name)}`).then((res) =>
        res.json(),
      ),
  });

  const [editableName, setEditableName] = useState(name);
  const [kontekst, setKontekst] = useState("");
  const [shortcut, setShortcut] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);
  const [shortcutError, setShortcutError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!confirmDelete) return;
    const handler = (e: MouseEvent) => {
      // if the user clicks anywhere outside the delete confirmation button, cancel it
      if (deleteRef.current && !deleteRef.current.contains(e.target as Node)) {
        setConfirmDelete(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [confirmDelete]);

  useEffect(() => {
    if (data) {
      setKontekst(data.kontekst ?? "");
      setShortcut(data.shortcut ?? "");
    }
  }, [data]);

  const isNew = data?.kontekst === undefined;

  const {
    mutate: saveKontekst,
    isPending,
    error: saveError,
  } = useMutation({
    mutationFn: async () => {
      setNameError(null);
      setContentError(null);
      setShortcutError(null);

      let valid = true;
      if (!isNew && !editableName.trim()) {
        setNameError("Name must contain at least 1 character.");
        valid = false;
      }
      if (!kontekst.trim()) {
        setContentError("Content must contain at least 1 character.");
        valid = false;
      }
      if (!isValidShortcut(shortcut)) {
        setShortcutError(SHORTCUT_VALIDATION_ERROR);
        valid = false;
      }
      if (!valid) throw new Error("Validation failed");

      if (!isNew && editableName !== name) {
        const res = await fetch("/api/kontekst", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, newName: editableName }),
        });
        if (!res.ok) throw new Error("Rename failed");
      }

      const res = await fetch("/api/kontekst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: isNew ? name : editableName,
          content: kontekst,
          shortcut,
          overwrite: true,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? `Request failed: ${res.status}`);
      }
    },

    onSuccess: () => navigate({ to: "/" }),
    onError: (error) => {
      if (error.message.includes("already assigned")) {
        setShortcutError(error.message);
      }
    },
  });

  const { mutate: deleteKontekst, isPending: isDeleting } = useMutation({
    mutationFn: () =>
      fetch(`/api/kontekst?name=${encodeURIComponent(name)}`, {
        method: "DELETE",
      }),
    onSuccess: () => navigate({ to: "/" }),
  });

  if (isLoading) return <p>Loading...</p>;
  if (isError) return <p>Something went wrong.</p>;

  return (
    <Card className="max-w-lg mx-auto mt-8">
      <CardHeader>
        <CardTitle>
          {isNew ? "Create" : "Edit"}{" "}
          <span className="font-mono">{name}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!isNew && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={editableName}
              onChange={(e) => {
                setEditableName(e.target.value);
                setNameError(null);
              }}
            />
            {nameError && (
              <p className="text-sm text-destructive">{nameError}</p>
            )}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="kontekst">Context</Label>
          <Textarea
            id="kontekst"
            value={kontekst}
            onChange={(e) => {
              setKontekst(e.target.value);
              setContentError(null);
            }}
          />
          {contentError && (
            <p className="text-sm text-destructive">{contentError}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="shortcut">Shortcut</Label>
          <ShortcutCaptureInput
            value={shortcut}
            onChange={(v) => {
              setShortcut(v);
              setShortcutError(null);
            }}
            onError={setShortcutError}
          />
          {shortcutError ? (
            <p className="text-sm text-destructive">{shortcutError}</p>
          ) : (
            <p className="text-sm text-muted-foreground">{SHORTCUT_HINT}</p>
          )}
        </div>
      </CardContent>
      {/* nameError and contentError are displayed separately */}
      {saveError && !shortcutError && !nameError && !contentError && (
        <p className="px-6 pb-2 text-sm text-destructive">
          {saveError.message}
        </p>
      )}
      <CardFooter className="gap-2 justify-end">
        {!isNew && (
          <div ref={deleteRef} className="mr-auto">
            {confirmDelete ? (
              <Button
                variant="destructive"
                onClick={() => deleteKontekst()}
                disabled={isDeleting}
              >
                Confirm delete
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={() => setConfirmDelete(true)}
              >
                Delete
              </Button>
            )}
          </div>
        )}
        <Button variant="outline" onClick={() => navigate({ to: "/" })}>
          Cancel
        </Button>
        <Button onClick={() => saveKontekst()} disabled={isPending}>
          {isNew ? "Create" : "Update"}
        </Button>
      </CardFooter>
    </Card>
  );
}
