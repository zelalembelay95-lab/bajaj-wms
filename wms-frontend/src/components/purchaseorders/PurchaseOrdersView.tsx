import { useEffect, useState } from "react";
import { FileText, Check, Ban, Loader2 } from "lucide-react";
import { api, ApiRequestError } from "../../lib/apiClient";
import type { PurchaseOrder } from "../../types";
import { useAuth } from "../../context/AuthContext";

const STATUS_META: Record<PurchaseOrder["status"], { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-graphite-700 text-steel-300" },
  SUBMITTED: { label: "Awaiting Approval", className: "bg-signal-amber-dim/40 text-signal-amber" },
  APPROVED: { label: "Approved", className: "bg-signal-teal-dim/40 text-signal-teal" },
  RECEIVED: { label: "Received", className: "bg-graphite-700 text-steel-300" },
  CANCELLED: { label: "Cancelled", className: "bg-signal-red-dim/40 text-signal-red" },
};

export function PurchaseOrdersView() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const canApprove = user?.role === "admin" || user?.role === "manager";

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    api
      .get<{ ok: true; orders: PurchaseOrder[] }>("/api/purchase-orders")
      .then((r) => setOrders(r.orders))
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : "Could not load purchase orders"))
      .finally(() => setLoading(false));
  }

  async function act(id: string, action: "approve" | "cancel") {
    setActingId(id);
    try {
      await api.put(`/api/purchase-orders/${id}/${action}`, {});
      load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : `Could not ${action} this order`);
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
      <header className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-widest text-signal-teal">Procurement</p>
        <h1 className="font-display text-2xl font-semibold md:text-3xl">Purchase Orders</h1>
        <p className="mt-1 text-sm text-steel-400">
          {canApprove ? "Approve or cancel pending orders for your branch." : "Track reorder requests raised from low-stock alerts."}
        </p>
      </header>

      {error && (
        <div className="mb-4 rounded-md border border-signal-amber-dim bg-signal-amber-dim/20 px-3 py-2 text-xs text-signal-amber">{error}</div>
      )}

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg border border-graphite-800 bg-graphite-900" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-graphite-700 py-16 text-center">
          <FileText size={28} className="mx-auto mb-2 text-steel-500" />
          <p className="font-medium text-paper">No purchase orders yet</p>
          <p className="text-sm text-steel-500">Generate one from the Low Stock Command Center.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {orders.map((o) => {
            const meta = STATUS_META[o.status];
            const busy = actingId === o._id;
            return (
              <div key={o._id} className="flex items-center justify-between gap-3 rounded-lg border border-graphite-700 bg-graphite-900 p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium text-paper">{o.partName || o.sku}</p>
                  <p className="font-mono text-xs text-steel-400">
                    {o.sku} · qty {o.qty} · {o.branchCode}
                  </p>
                  {o.createdBy && <p className="text-xs text-steel-500">Requested by {o.createdBy.name}</p>}
                  {o.approvedBy && <p className="text-xs text-signal-teal">Approved by {o.approvedBy.name}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${meta.className}`}>{meta.label}</span>
                  {canApprove && o.status === "SUBMITTED" && (
                    <>
                      <button
                        onClick={() => act(o._id, "approve")}
                        disabled={busy}
                        className="flex items-center gap-1 rounded-md bg-signal-teal px-2.5 py-1.5 text-xs font-semibold text-graphite-950 hover:opacity-90 disabled:opacity-50"
                      >
                        {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                        Approve
                      </button>
                      <button
                        onClick={() => act(o._id, "cancel")}
                        disabled={busy}
                        className="flex items-center gap-1 rounded-md border border-graphite-600 px-2.5 py-1.5 text-xs font-medium text-steel-400 hover:text-signal-red disabled:opacity-50"
                      >
                        <Ban size={13} />
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
