"use client";

import { AlertTriangle, LoaderCircle, RefreshCw, WifiOff } from "lucide-react";
import type { ResourceStatus } from "@/types/safeguard";

type Props = {
  status: ResourceStatus;
  error?: string;
  onRetry?: () => void;
  emptyMessage?: string;
  compact?: boolean;
};

export default function ResourceMessage({ status, error, onRetry, emptyMessage = "No records were returned by this source.", compact = false }: Props) {
  if (status === "success") return null;
  if (status === "loading") {
    return (
      <div className={`resource-message ${compact ? "resource-message-compact" : ""}`} role="status" aria-live="polite">
        <LoaderCircle size={17} className="spin-icon" aria-hidden="true" />
        <span>Checking source data…</span>
      </div>
    );
  }
  if (status === "empty") {
    return (
      <div className={`resource-message ${compact ? "resource-message-compact" : ""}`} role="status">
        <AlertTriangle size={17} aria-hidden="true" />
        <span>{emptyMessage}</span>
      </div>
    );
  }
  if (status === "stale") {
    return (
      <div className={`resource-message resource-message-stale ${compact ? "resource-message-compact" : ""}`} role="status">
        <AlertTriangle size={17} aria-hidden="true" />
        <span>Showing last available data. {error ?? "A fresh source response has not been confirmed."}</span>
        {onRetry && <button className="text-action" type="button" onClick={onRetry}><RefreshCw size={14} /> Retry</button>}
      </div>
    );
  }
  return (
    <div className={`resource-message resource-message-error ${compact ? "resource-message-compact" : ""}`} role="alert">
      <WifiOff size={17} aria-hidden="true" />
      <span>{error ?? "This source is temporarily unavailable."}</span>
      {onRetry && <button className="text-action" type="button" onClick={onRetry}><RefreshCw size={14} /> Retry</button>}
    </div>
  );
}
