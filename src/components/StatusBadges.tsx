import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusLabel } from "@/lib/solution-vault";

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "accepted" || status === "manually_verified"
      ? "bg-success/15 text-success border-success/30"
      : status === "submitted"
        ? "bg-accent/15 text-accent border-accent/30"
        : "bg-muted text-muted-foreground border-border";
  return (
    <Badge variant="outline" className={cn("font-medium", tone)}>
      {statusLabel(status)}
    </Badge>
  );
}

const VERIFICATION_LABEL: Record<string, string> = {
  not_required: "No verification needed",
  manual_required: "Manual verification required",
  pending: "Verification pending",
  verified: "Verified",
  failed: "Verification failed",
};

export function VerificationBadge({ state }: { state: string }) {
  const tone =
    state === "verified"
      ? "bg-success/15 text-success border-success/30"
      : state === "failed"
        ? "bg-destructive/15 text-destructive border-destructive/30"
        : state === "manual_required"
          ? "bg-warning/15 text-warning border-warning/30"
          : "bg-muted text-muted-foreground border-border";
  return (
    <Badge variant="outline" className={cn("font-medium", tone)}>
      {VERIFICATION_LABEL[state] ?? state}
    </Badge>
  );
}

const EXPORT_LABEL: Record<string, string> = {
  not_exported: "Not exported",
  queued: "Export queued",
  in_progress: "Exporting…",
  exported: "Exported",
  failed: "Export failed",
};

export function ExportBadge({ state }: { state: string }) {
  const tone =
    state === "exported"
      ? "bg-success/15 text-success border-success/30"
      : state === "failed"
        ? "bg-destructive/15 text-destructive border-destructive/30"
        : "bg-muted text-muted-foreground border-border";
  return (
    <Badge variant="outline" className={cn("font-medium", tone)}>
      {EXPORT_LABEL[state] ?? state}
    </Badge>
  );
}
