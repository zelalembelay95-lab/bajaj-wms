import type { ZoneType } from "../../types";

const ZONE_ACCENT: Record<ZoneType, string> = {
  BULK_FLOOR_STORAGE: "bg-steel-400",
  PALLET_RACKING: "bg-steel-400",
  HIGH_DENSITY_MICRO_BIN: "bg-signal-teal",
  SHELVING_STANDARD: "bg-signal-teal",
  HAZMAT_CAGE: "bg-signal-amber",
  STAGING_OUTBOUND: "bg-steel-400",
  STAGING_INBOUND: "bg-steel-400",
  RETURNS_QUARANTINE: "bg-signal-red",
};

interface BinTagProps {
  code: string;
  zoneType?: ZoneType;
  size?: "sm" | "md";
}

/**
 * Renders like a printed shelf label: a thin zone-colored accent bar over a
 * monospace location code. This is the one visual motif every view shares.
 */
export function BinTag({ code, zoneType, size = "md" }: BinTagProps) {
  const accent = zoneType ? ZONE_ACCENT[zoneType] : "bg-steel-400";
  const pad = size === "sm" ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-xs";

  return (
    <span
      className={`inline-flex items-stretch overflow-hidden rounded-sm border border-graphite-600 bg-graphite-800 ${pad}`}
    >
      <span className={`mr-2 w-1 -my-1.5 -ml-2.5 ${accent}`} aria-hidden />
      <span className="font-mono tracking-tight text-paper">{code}</span>
    </span>
  );
}
