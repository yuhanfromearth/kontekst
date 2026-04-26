import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Checkbox } from "#/components/ui/checkbox";
import { ShortcutCaptureInput } from "#/components/ShortcutCaptureInput";
import {
  isValidShortcut,
  shortcutHint,
  shortcutValidationError,
} from "#/lib/shortcut";
import { useIsMac } from "#/lib/platform";
import type { KontekstDto } from "@kontekst/dtos";

export const Route = createFileRoute("/kontekst/$name")({
  component: KontekstEditPage,
});

function KontekstEditPage() {
  const { name } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMac = useIsMac();

  const { data, isLoading, isError } = useQuery<KontekstDto>({
    queryKey: ["kontekst", name],
    queryFn: () =>
      fetch(`/api/kontekst?name=${encodeURIComponent(name)}`).then((res) =>
        res.json(),
      ),
  });

  const { data: savedDefault } = useQuery<string | null>({
    queryKey: ["konteksts", "default"],
    queryFn: async () => {
      const res = await fetch("/api/konteksts/default");
      if (!res.ok) throw new Error("Failed to fetch default kontekst");
      const data: { name: string | null } = await res.json();
      return data.name;
    },
  });

  const [editableName, setEditableName] = useState(name);
  const [kontekst, setKontekst] = useState("");
  const [shortcut, setShortcut] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);
  const [shortcutError, setShortcutError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") navigate({ to: "/" });
    };
    document.addEventListener("keydown", handler);

    return () => document.removeEventListener("keydown", handler);
  }, [navigate]);

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
      if (data.kontekst === undefined) setEditableName("");
    }
  }, [data]);

  useEffect(() => {
    if (savedDefault !== undefined) {
      setIsDefault(savedDefault === name);
    }
  }, [savedDefault, name]);

  const wasDefault = savedDefault === name;

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
      if (!editableName.trim()) {
        setNameError("Name must contain at least 1 character.");
        valid = false;
      }
      if (!kontekst.trim()) {
        setContentError("Content must contain at least 1 character.");
        valid = false;
      }
      if (!isValidShortcut(shortcut)) {
        setShortcutError(shortcutValidationError());
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
          name: editableName,
          content: kontekst,
          shortcut,
          overwrite: true,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? `Request failed: ${res.status}`);
      }

      if (isDefault) {
        const defaultRes = await fetch("/api/konteksts/default", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: editableName }),
        });
        if (!defaultRes.ok) {
          const body = await defaultRes.json().catch(() => null);
          throw new Error(body?.message ?? "Failed to set as default");
        }
      } else if (wasDefault) {
        const defaultRes = await fetch("/api/konteksts/default", {
          method: "DELETE",
        });
        if (!defaultRes.ok) {
          const body = await defaultRes.json().catch(() => null);
          throw new Error(body?.message ?? "Failed to clear default");
        }
      }
    },

    onSuccess: () => {
      // Tell the query cache the kontekst list is stale so the home page
      // immediately refetches it. Without this, the cached (old) list would
      // be used after setting a new default and the wrong kontekst would appear selected.
      queryClient.invalidateQueries({ queryKey: ["konteksts"] });
      queryClient.invalidateQueries({ queryKey: ["konteksts", "default"] });
      navigate({ to: "/" });
    },
    onError: (error) => {
      if (error.message.includes("already assigned")) {
        setShortcutError(error.message);
      }
    },
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && e.key === "Enter") saveKontekst();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [saveKontekst, isMac]);

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
    <>
      <div className="max-w-lg mx-auto w-full">
        <button
          type="button"
          onClick={() => navigate({ to: "/" })}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 -ml-0.5"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
      </div>
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>
            {isNew ? (
              "Create new Kontekst"
            ) : (
              <>
                Edit <span className="font-mono">{name}</span>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
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
              <p className="text-sm text-muted-foreground">{shortcutHint()}</p>
            )}
          </div>
          {!isNew && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="isDefault"
                checked={isDefault}
                onCheckedChange={(checked) => setIsDefault(checked === true)}
              />
              <Label htmlFor="isDefault">Set as default</Label>
            </div>
          )}
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
    </>
  );
}
