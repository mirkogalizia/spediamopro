'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, RefreshCcw, CalendarCheck2, Filter, Download } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

type ShipmentRow = {
  id: string | null;
  carrier: string | null;
  service: string | null;
  amount: number;
  date: string | null;
  status: string | null;
};

type KpiResponse = {
  ok: boolean;
  period: { from: string; to: string };
  totals: { shipments: number; totalAmount: number; avgCost: number; currency: string };
  last30days: {
    shipments: number;
    totalAmount: number;
    avgCost: number;
    currency: string;
    window: { from: string; to: string };
  };
  list?: ShipmentRow[];
  error?: string;
};

function fmtCurrency(v: number, currency = 'EUR') {
  try { return new Intl.NumberFormat('it-IT', { style: 'currency', currency }).format(v || 0); }
  catch { return `${v?.toFixed?.(2) ?? v} ${currency}`; }
}
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export default function KPIPage() {
  const [from, setFrom] = useState<string>(ymd(addDays(new Date(), -29)));
  const [to, setTo] = useState<string>(ymd(new Date()));
  const [data, setData] = useState<KpiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const currency = data?.totals.currency ?? 'EUR';

  const fetchWithFallback = async (qs: string): Promise<KpiResponse> => {
    // 1) prova KV fast (se l’hai messa)
    let res = await fetch(`/api/kpi-fast?${qs}`, { cache: 'no-store' });
    if (res.ok) return res.json();

    // 2) fallback su SpediamoPro
    res = await fetch(`/api/kpi-spedizioni?${qs}`, { cache: 'no-store' });
    const json = await res.json();
    if (!res.ok || !json?.ok) {
      throw new Error(json?.error || `HTTP ${res.status}`);
    }
    return json;
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ from, to, list: '1' }).toString();
      const json = await fetchWithFallback(qs);
      setData(json);
    } catch (e: any) {
      setError(e?.message || 'Errore sconosciuto');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const rows = useMemo(() => {
    return (data?.list || []).slice().sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });
  }, [data]);

  const chartData = useMemo(() => {
    const byDay: Record<string, { sum: number; n: number }> = {};
    for (const r of rows) {
      if (!r.date) continue;
      const d = ymd(new Date(r.date));
      byDay[d] ??= { sum: 0, n: 0 };
      byDay[d].sum += r.amount || 0;
      byDay[d].n += 1;
    }
    const start = new Date(from);
    const end = new Date(to);
    const out: Array<{ date: string; avg: number }> = [];
    for (let cur = new Date(start); cur <= end; cur = addDays(cur, 1)) {
      const key = ymd(cur);
      const entry = byDay[key];
      const avg = entry && entry.n > 0 ? entry.sum / entry.n : 0;
      out.push({ date: key, avg: Number(avg.toFixed(2)) });
    }
    return out;
  }, [rows, from, to]);

  const exportCSV = () => {
    const header = ['ID', 'Corriere', 'Servizio', 'Data', 'Importo', 'Stato'];
    const body = rows.map(r => [
      r.id ?? '',
      r.carrier ?? '',
      r.service ?? '',
      r.date ? new Date(r.date).toLocaleString('it-IT') : '',
      (r.amount ?? 0).toFixed(2).replace('.', ','),
      (r.status ?? '').toString()
    ]);
    const csv = [header, ...body].map(line => line.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `kpi-spedizioni_${from}_${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const setQuickRange = (days: number) => {
    const end = new Date();
    const start = addDays(end, -days + 1);
    setFrom(ymd(start));
    setTo(ymd(end));
  };

  return (
    <div className="min-h-screen w-full bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">KPI Spedizioni</h1>
            <p className="text-sm text-muted-foreground">
              Dashboard professionale con dati aggregati.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex items-end gap-2">
              <div className="flex flex-col">
                <label className="text-xs text-muted-foreground">Dal</label>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-muted-foreground">Al</label>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
              <Button onClick={fetchData} disabled={loading} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                Aggiorna
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" className="gap-2" onClick={() => setQuickRange(1)}>
                <CalendarCheck2 className="h-4 w-4" /> Oggi
              </Button>
              <Button variant="secondary" onClick={() => setQuickRange(7)}>Ultimi 7</Button>
              <Button variant="secondary" onClick={() => setQuickRange(30)}>Ultimi 30</Button>
              <Button variant="outline" className="gap-2" onClick={exportCSV}>
                <Download className="h-4 w-4" /> Export CSV
              </Button>
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Totale speso (periodo)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {data ? fmtCurrency(data.totals.totalAmount, currency) : '—'}
              </div>
              <div className="text-xs text-muted-foreground">
                {data ? `${data.period.from} → ${data.period.to}` : '—'}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Numero spedizioni</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{data ? data.totals.shipments : '—'}</div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Costo medio (periodo)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {data ? fmtCurrency(data.totals.avgCost, currency) : '—'}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Media 30 giorni (costo medio)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {data ? fmtCurrency(data.last30days.avgCost, data.last30days.currency) : '—'}
              </div>
              <div className="text-xs text-muted-foreground">
                {data ? `${data.last30days.window.from} → ${data.last30days.window.to}` : '—'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Grafico */}
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <Card className="shadow-sm lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Costo medio giornaliero</CardTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Filter className="h-4 w-4" />
                  {data ? `${data.period.from} → ${data.period.to}` : ''}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-[320px]">
                {loading ? (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ left: 8, right: 8, top: 10, bottom: 0 }}>
                      <CartesianGrid strokeOpacity={0.2} vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} minTickGap={24} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => fmtCurrency(Number(v), currency)} />
                      <Tooltip
                        formatter={(value) => [fmtCurrency(Number(value), currency), 'Costo medio']}
                        labelFormatter={(label) => new Date(label).toLocaleDateString('it-IT')}
                      />
                      <Area type="monotone" dataKey="avg" strokeOpacity={0.9} fillOpacity={0.2} strokeWidth={2} dot={false}/>
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Riepilogo rapido */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Riepilogo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Periodo</span>
                <span className="text-sm font-medium">{data ? `${data.period.from} → ${data.period.to}` : '—'}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Totale speso</span>
                <span className="text-sm font-medium">{data ? fmtCurrency(data.totals.totalAmount, currency) : '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground"># Spedizioni</span>
                <span className="text-sm font-medium">{data ? data.totals.shipments : '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Costo medio</span>
                <span className="text-sm font-medium">{data ? fmtCurrency(data.totals.avgCost, currency) : '—'}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Media 30 giorni</span>
                <span className="text-sm font-medium">{data ? fmtCurrency(data.last30days.avgCost, currency) : '—'}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            Errore: {error}
          </div>
        )}

        {/* Tabella */}
        <div className="mt-6">
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Spedizioni pagate del periodo</CardTitle>
                <div className="text-xs text-muted-foreground">{rows.length} righe</div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center gap-2 py-8 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Caricamento…
                </div>
              ) : rows.length === 0 ? (
                <div className="py-6 text-sm text-muted-foreground">Nessuna spedizione trovata per il periodo selezionato.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[140px]">ID</TableHead>
                        <TableHead>Corriere</TableHead>
                        <TableHead>Servizio</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Importo</TableHead>
                        <TableHead>Stato</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r, idx) => (
                        <TableRow key={`${r.id ?? 'row'}-${idx}`}>
                          <TableCell className="font-medium">{r.id ?? '—'}</TableCell>
                          <TableCell>{r.carrier ?? '—'}</TableCell>
                          <TableCell>{r.service ?? '—'}</TableCell>
                          <TableCell>{r.date ? new Date(r.date).toLocaleString('it-IT') : '—'}</TableCell>
                          <TableCell className="text-right">{fmtCurrency(r.amount || 0, currency)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{String(r.status || '').toUpperCase() || '—'}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}