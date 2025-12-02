"use client";

import { useEffect, useState } from "react";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  where 
} from "firebase/firestore";

// ✅ Firebase config client-side
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

type OrderStatus = "received" | "pending" | "processing" | "completed" | "failed";

type OrderLog = {
  id: string;
  order_number: string;
  order_id: number;
  status: OrderStatus;
  total_items: number;
  items_processed: number;
  items_success: number;
  items_failed: number;
  progress_percent: number;
  current_item?: string;
  received_at: string;
  started_at?: string;
  completed_at?: string;
  last_update?: string;
  items?: Record<string, any>;
};

export default function OrdersMonitorPage() {
  const [orders, setOrders] = useState<OrderLog[]>([]);
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [maxOrders, setMaxOrders] = useState(20);

  useEffect(() => {
    // ✅ Real-time listener
    let q = query(
      collection(db, "orders_stock_log"),
      orderBy("received_at", "desc"),
      limit(maxOrders)
    );

    // Filtra per stato se necessario
    if (filter !== "all") {
      q = query(
        collection(db, "orders_stock_log"),
        where("status", "==", filter),
        orderBy("received_at", "desc"),
        limit(maxOrders)
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const ordersList: OrderLog[] = [];
        snapshot.forEach((doc) => {
          ordersList.push({ id: doc.id, ...doc.data() } as OrderLog);
        });
        setOrders(ordersList);
      },
      (error) => {
        console.error("❌ Errore listener:", error);
      }
    );

    return () => unsubscribe();
  }, [filter, maxOrders]);

  function toggleOrder(orderId: string) {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  }

  const stats = {
    processing: orders.filter((o) => o.status === "processing" || o.status === "pending").length,
    completed: orders.filter((o) => o.status === "completed").length,
    failed: orders.filter((o) => o.status === "failed").length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 pb-20">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl shadow-lg border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-[1800px] mx-auto px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-3xl">📊</span>
              </div>
              <div>
                <h1 className="text-5xl font-black bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  Orders Monitor
                </h1>
                <p className="text-gray-600 mt-1 font-medium flex items-center gap-2">
                  Real-time processing status
                  <span className="inline-block w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                </p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 shadow-xl transform transition-all hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-semibold uppercase tracking-wide">
                    In Lavorazione
                  </p>
                  <p className="text-5xl font-black text-white mt-2">
                    {stats.processing}
                  </p>
                </div>
                <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                  <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 shadow-xl transform transition-all hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-semibold uppercase tracking-wide">
                    Completati
                  </p>
                  <p className="text-5xl font-black text-white mt-2">
                    {stats.completed}
                  </p>
                </div>
                <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                  <span className="text-4xl">✅</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl p-6 shadow-xl transform transition-all hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm font-semibold uppercase tracking-wide">
                    Falliti
                  </p>
                  <p className="text-5xl font-black text-white mt-2">
                    {stats.failed}
                  </p>
                </div>
                <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                  <span className="text-4xl">❌</span>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-4 items-center flex-wrap">
            <button
              onClick={() => setFilter("all")}
              className={`px-6 py-3 rounded-xl font-bold transition-all ${
                filter === "all"
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-105"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Tutti ({orders.length})
            </button>
            <button
              onClick={() => setFilter("processing")}
              className={`px-6 py-3 rounded-xl font-bold transition-all ${
                filter === "processing"
                  ? "bg-blue-600 text-white shadow-lg scale-105"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              In Lavorazione ({stats.processing})
            </button>
            <button
              onClick={() => setFilter("completed")}
              className={`px-6 py-3 rounded-xl font-bold transition-all ${
                filter === "completed"
                  ? "bg-green-600 text-white shadow-lg scale-105"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Completati ({stats.completed})
            </button>
            <button
              onClick={() => setFilter("failed")}
              className={`px-6 py-3 rounded-xl font-bold transition-all ${
                filter === "failed"
                  ? "bg-red-600 text-white shadow-lg scale-105"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Falliti ({stats.failed})
            </button>

            <div className="flex-1"></div>

            <select
              value={maxOrders}
              onChange={(e) => setMaxOrders(parseInt(e.target.value))}
              className="px-6 py-3 rounded-xl border-2 border-gray-300 font-bold bg-white"
            >
              <option value="20">Ultimi 20</option>
              <option value="50">Ultimi 50</option>
              <option value="100">Ultimi 100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="max-w-[1800px] mx-auto px-8 py-10">
        {orders.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-2xl p-20 text-center">
            <div className="text-8xl mb-6">📭</div>
            <h3 className="text-3xl font-bold text-gray-800 mb-3">
              Nessun ordine trovato
            </h3>
            <p className="text-gray-500 text-lg">
              Gli ordini appariranno qui in real-time
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const isExpanded = expandedOrders.has(order.id);
              
              const statusConfig = {
                received: {
                  bg: "bg-gray-50 hover:bg-gray-100",
                  border: "border-gray-300",
                  iconBg: "bg-gray-200",
                  icon: "📥",
                  label: "Ricevuto",
                  color: "text-gray-700",
                },
                pending: {
                  bg: "bg-yellow-50 hover:bg-yellow-100",
                  border: "border-yellow-300",
                  iconBg: "bg-yellow-200",
                  icon: "⏳",
                  label: "In Attesa",
                  color: "text-yellow-700",
                },
                processing: {
                  bg: "bg-blue-50 hover:bg-blue-100",
                  border: "border-blue-400",
                  iconBg: "bg-blue-200",
                  icon: "⚙️",
                  label: "In Lavorazione",
                  color: "text-blue-700",
                },
                completed: {
                  bg: "bg-green-50 hover:bg-green-100",
                  border: "border-green-400",
                  iconBg: "bg-green-200",
                  icon: "✅",
                  label: "Completato",
                  color: "text-green-700",
                },
                failed: {
                  bg: "bg-red-50 hover:bg-red-100",
                  border: "border-red-400",
                  iconBg: "bg-red-200",
                  icon: "❌",
                  label: "Fallito",
                  color: "text-red-700",
                },
              };

              const config = statusConfig[order.status] || statusConfig.pending;

              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-2xl shadow-xl overflow-hidden border-2 ${config.border} transition-all`}
                >
                  {/* Header */}
                  <button
                    onClick={() => toggleOrder(order.id)}
                    className={`w-full px-8 py-6 flex items-center gap-6 transition-all ${config.bg}`}
                  >
                    <div className="flex-shrink-0">
                      <div
                        className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl ${config.iconBg} relative`}
                      >
                        {config.icon}
                        {order.status === "processing" && (
                          <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-2xl animate-spin"></div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h2 className="text-2xl font-black text-gray-800">
                          Ordine #{order.order_number}
                        </h2>
                        <span
                          className={`px-4 py-1 rounded-full text-sm font-bold ${config.color} bg-white`}
                        >
                          {config.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 font-medium">
                        {new Date(order.received_at).toLocaleString("it-IT", {
                          dateStyle: "medium",
                          timeStyle: "medium",
                        })}
                        {order.last_update && (order.status === "processing" || order.status === "pending") && (
                          <span className="ml-4 text-blue-600">
                            🔄 Aggiornato:{" "}
                            {new Date(order.last_update).toLocaleTimeString("it-IT")}
                          </span>
                        )}
                      </p>

                      {/* Current Item (solo se processing) */}
                      {order.status === "processing" && order.current_item && (
                        <p className="text-sm text-gray-700 font-semibold mt-2 animate-pulse">
                          📝 {order.current_item}
                        </p>
                      )}
                    </div>

                    {/* Progress & Stats */}
                    <div className="flex gap-6 items-center">
                      {order.status !== "received" && order.status !== "pending" && (
                        <>
                          <div className="text-center">
                            <p className="text-sm text-gray-600 font-semibold">
                              Items
                            </p>
                            <p className="text-3xl font-black text-blue-600">
                              {order.items_processed || 0}/{order.total_items}
                            </p>
                          </div>

                          {order.status === "completed" && (
                            <>
                              <div className="text-center">
                                <p className="text-sm text-gray-600 font-semibold">
                                  Successi
                                </p>
                                <p className="text-3xl font-black text-green-600">
                                  {order.items_success || 0}
                                </p>
                              </div>

                              {(order.items_failed || 0) > 0 && (
                                <div className="text-center">
                                  <p className="text-sm text-gray-600 font-semibold">
                                    Errori
                                  </p>
                                  <p className="text-3xl font-black text-red-600">
                                    {order.items_failed}
                                  </p>
                                </div>
                              )}
                            </>
                          )}
                        </>
                      )}

                      <div className="text-gray-600 text-3xl ml-4">
                        {isExpanded ? "▼" : "▶"}
                      </div>
                    </div>
                  </button>

                  {/* Progress Bar */}
                  {(order.status === "processing" || order.status === "pending") && (
                    <div className="px-8 py-4 bg-blue-50 border-t-2 border-blue-200">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="h-6 bg-white rounded-full overflow-hidden shadow-inner">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500 ease-out flex items-center justify-end pr-2"
                              style={{ width: `${order.progress_percent || 0}%` }}
                            >
                              {(order.progress_percent || 0) > 10 && (
                                <span className="text-xs font-bold text-white">
                                  {order.progress_percent}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="text-2xl font-black text-blue-600 min-w-[60px] text-right">
                          {order.progress_percent || 0}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Details */}
                  {isExpanded && (
                    <div className="p-8 border-t-2 border-gray-100">
                      {order.items && Object.keys(order.items).length > 0 ? (
                        <div className="space-y-4">
                          <h3 className="text-xl font-bold text-gray-800 mb-4">
                            📦 Dettagli Items
                          </h3>
                          {Object.entries(order.items).map(([variantId, itemData]: [string, any]) => (
                            <div
                              key={variantId}
                              className={`rounded-xl p-4 border-2 ${
                                itemData.status === "completed"
                                  ? "bg-green-50 border-green-200"
                                  : itemData.status === "failed"
                                  ? "bg-red-50 border-red-200"
                                  : itemData.status === "skipped"
                                  ? "bg-gray-50 border-gray-200"
                                  : "bg-blue-50 border-blue-200"
                              }`}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <p className="font-bold text-gray-800 mb-1">
                                    {itemData.blank_key?.replaceAll("_", " ").toUpperCase() || "N/A"}
                                  </p>
                                  {itemData.size && itemData.color && (
                                    <div className="flex gap-4 text-sm text-gray-600">
                                      <span>
                                        <strong>Taglia:</strong> {itemData.size}
                                      </span>
                                      <span>
                                        <strong>Colore:</strong> {itemData.color}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                                    itemData.status === "completed"
                                      ? "bg-green-200 text-green-800"
                                      : itemData.status === "failed"
                                      ? "bg-red-200 text-red-800"
                                      : itemData.status === "skipped"
                                      ? "bg-gray-200 text-gray-800"
                                      : itemData.status === "updating_graphics"
                                      ? "bg-blue-200 text-blue-800"
                                      : "bg-yellow-200 text-yellow-800"
                                  }`}
                                >
                                  {itemData.status === "updating_blank" && "📦 Updating Blank"}
                                  {itemData.status === "updating_graphics" && "🎨 Updating Graphics"}
                                  {itemData.status === "completed" && "✅ Completato"}
                                  {itemData.status === "failed" && "❌ Fallito"}
                                  {itemData.status === "skipped" && "⏭️ Saltato"}
                                </span>
                              </div>

                              {/* Stock Info */}
                              {itemData.stock_updated && (
                                <div className="mb-3">
                                  <p className="text-sm font-semibold text-gray-700">
                                    Stock: {itemData.previous_stock} → {itemData.new_stock}
                                  </p>
                                </div>
                              )}

                              {/* Graphics Progress */}
                              {itemData.total_graphics && (
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-semibold text-gray-700">
                                      Grafiche: {itemData.graphics_processed || 0}/
                                      {itemData.total_graphics}
                                    </span>
                                    <span className="text-sm font-bold text-blue-600">
                                      {itemData.graphics_percent || 0}%
                                    </span>
                                  </div>
                                  <div className="h-4 bg-white rounded-full overflow-hidden shadow-inner">
                                    <div
                                      className="h-full bg-gradient-to-r from-blue-400 to-purple-500 transition-all duration-300"
                                      style={{
                                        width: `${itemData.graphics_percent || 0}%`,
                                      }}
                                    ></div>
                                  </div>
                                </div>
                              )}

                              {/* Graphics Errors */}
                              {itemData.graphics_errors && itemData.graphics_errors.length > 0 && (
                                <div className="mt-3 bg-red-100 rounded-lg p-3">
                                  <p className="text-sm font-bold text-red-800 mb-1">
                                    ⚠️ {itemData.graphics_errors.length} grafiche con errori
                                  </p>
                                  <details className="text-xs text-red-700">
                                    <summary className="cursor-pointer font-semibold">
                                      Mostra dettagli
                                    </summary>
                                    <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                                      {itemData.graphics_errors.slice(0, 5).map((err: any, idx: number) => (
                                        <p key={idx}>
                                          • {err.product_title}: {err.error}
                                        </p>
                                      ))}
                                    </div>
                                  </details>
                                </div>
                              )}

                              {/* Skipped reason */}
                              {itemData.reason && (
                                <div className="mt-3 text-sm text-gray-600">
                                  ℹ️ {itemData.reason}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <p className="text-lg">Nessun dettaglio disponibile</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
