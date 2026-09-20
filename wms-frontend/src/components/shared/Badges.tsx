import { Zap, CircleDot, Cog, Disc3, Fuel, Wind, PaintBucket, Bolt, CircleGauge, Package } from "lucide-react";
import type { PartCategory } from "../../types";

const CATEGORY_META: Record<PartCategory, { label: string; icon: typeof Cog; className: string }> = {
  Engine: { label: "Engine", icon: Cog, className: "bg-graphite-700 text-paper" },
  Electrical: { label: "Electrical", icon: Zap, className: "bg-graphite-700 text-paper" },
  Braking: { label: "Braking", icon: Disc3, className: "bg-graphite-700 text-paper" },
  Body: { label: "Body", icon: PaintBucket, className: "bg-graphite-700 text-paper" },
  Suspension: { label: "Suspension", icon: CircleDot, className: "bg-graphite-700 text-paper" },
  Transmission: { label: "Transmission", icon: Cog, className: "bg-graphite-700 text-paper" },
  Fuel_System: { label: "Fuel System", icon: Fuel, className: "bg-graphite-700 text-paper" },
  Exhaust: { label: "Exhaust", icon: Wind, className: "bg-graphite-700 text-paper" },
  Fasteners_Consumables: { label: "Fasteners", icon: Bolt, className: "bg-graphite-700 text-paper" },
  Tyres_Wheels: { label: "Tyres & Wheels", icon: CircleGauge, className: "bg-graphite-700 text-paper" },
  Accessories: { label: "Accessories", icon: Package, className: "bg-graphite-700 text-paper" },
};

export function CategoryBadge({ category }: { category: PartCategory }) {
  const meta = CATEGORY_META[category];
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.className}`}
    >
      <Icon size={12} strokeWidth={2.25} />
      {meta.label}
    </span>
  );
}

/**
 * Heavy/oversize items (engines, alloy wheels, frames) get a literal
 * hazard-stripe badge — the one place in the UI we borrow warehouse
 * signage directly, reserved for this single warning so it keeps meaning.
 */
export function WeightBadge({ isHeavy }: { isHeavy: boolean }) {
  if (!isHeavy) {
    return (
      <span className="inline-flex items-center rounded-full bg-graphite-700 px-2 py-0.5 text-[11px] font-medium text-steel-300">
        Standard
      </span>
    );
  }
  return (
    <span className="hazard-stripe inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-bold text-graphite-950 shadow-sm">
      HEAVY — 2-PERSON LIFT
    </span>
  );
}

export function StockHealthBar({ available, min, max }: { available: number; min: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (available / max) * 100));
  const color = available <= min ? "bg-signal-red" : available <= min * 1.5 ? "bg-signal-amber" : "bg-signal-teal";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-graphite-700">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
