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

export const Route = createFileRoute("/kontekst/$name")({
  component: KontekstEditPage,
});

interface KontekstDto {
  kontekst: string | undefined;
  shortcut: string | undefined;
}

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

  const { mutate: save, isPending } = useMutation({
    mutationFn: async () => {
      setShortcutError(null);
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
      if (res.status === 409) {
        const body = await res.json();
        throw new Error(body.message);
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
          {isNew ? "Create" : "Edit"} {isNew ? name : editableName}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!isNew && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={editableName}
              onChange={(e) => setEditableName(e.target.value)}
            />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="kontekst">Context</Label>
          <Textarea
            id="kontekst"
            value={kontekst}
            onChange={(e) => setKontekst(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="shortcut">Shortcut</Label>
          <Input
            id="shortcut"
            value={shortcut}
            onChange={(e) => {
              setShortcut(e.target.value);
              setShortcutError(null);
            }}
            placeholder="e.g. cmd+1"
          />
          {shortcutError && (
            <p className="text-sm text-destructive">{shortcutError}</p>
          )}
        </div>
      </CardContent>
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
        <Button onClick={() => save()} disabled={isPending}>
          {isNew ? "Create" : "Update"}
        </Button>
      </CardFooter>
    </Card>
  );
}
