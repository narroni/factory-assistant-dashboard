"use client";

import { useState, useEffect } from "react";
import { getPackagingOptions, runPackagingCalculation, type BladeProductSummary, type ContainerSummary } from "./actions";
import type { PackagingResult } from "../../lib/packaging-calculator";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}
function fmtKg(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(2)} t (${n.toLocaleString()} kg)`;
  return `${n.toFixed(2)} kg`;
}
function fmtN(n: number): string {
  return n.toLocaleString();
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-zinc-800 last:border-b-0">
      <span className="text-xs text-zinc-500 shrink-0">{label}</span>
      <span className="text-xs text-zinc-200 text-right">{value}</span>
    </div>
  );
}

function StatusBadge({ fits, label }: { fits: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded font-medium ${
      fits
        ? "bg-zinc-800 text-zinc-300 border border-zinc-700"
        : "bg-zinc-900 text-red-400 border border-red-900"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${fits ? "bg-emerald-500" : "bg-red-500"}`} />
      {label}
    </span>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800">
      <div className="px-4 py-3 border-b border-zinc-800">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

function ProgressBar({ value, max, warn }: { value: number; max: number; warn: boolean }) {
  const pct = Math.min((value / max) * 100, 100);
  const over = value > max;
  return (
    <div className="mt-1">
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${over ? "bg-red-500" : warn ? "bg-amber-500" : "bg-zinc-400"}`}
          style={{ width: `${over ? 100 : pct}%` }}
        />
      </div>
      <div className="flex justify-between mt-0.5">
        <span className={`text-xs ${over ? "text-red-400" : "text-zinc-400"}`}>{pct.toFixed(1)}%</span>
        <span className="text-xs text-zinc-600">{fmtN(Math.round(max))} limit</span>
      </div>
    </div>
  );
}

// ── Result Panel ──────────────────────────────────────────────────────────────

function ResultPanel({ result }: { result: PackagingResult }) {
  const limitingLabel =
    result.limitingFactors.length === 0
      ? "None"
      : result.limitingFactors.join(", ");

  return (
    <div className="space-y-4">
      {/* Verdict */}
      <div className={`rounded-lg border px-5 py-4 flex items-center gap-4 ${
        result.overallFits
          ? "bg-zinc-900 border-zinc-700"
          : "bg-zinc-900 border-red-900/60"
      }`}>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-lg font-bold ${
          result.overallFits ? "bg-zinc-800 text-zinc-300" : "bg-red-950 text-red-400"
        }`}>
          {result.overallFits ? "✓" : "✕"}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-base font-semibold ${result.overallFits ? "text-zinc-100" : "text-red-400"}`}>
            {result.overallFits ? "Fits in container" : "Does not fit"}
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {result.qty.toLocaleString()} pcs of {result.articleCode} → {result.containerName} container
          </p>
          {!result.overallFits && (
            <p className="text-xs text-red-400 mt-1">Limiting: {limitingLabel}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <StatusBadge fits={result.weightFits} label="Weight" />
          <StatusBadge fits={result.areaFits} label="Area" />
          <StatusBadge fits={result.volumeFits} label="Volume" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Crating */}
        <Card title="Crating">
          <InfoRow label="Crate type" value={result.crateCode} />
          <InfoRow label="Crates required" value={`${fmtN(result.fullCrates)} crates`} />
          <InfoRow label="Partial last crate" value={`${(result.partialCrate * 100).toFixed(1)}%`} />
          <InfoRow label="Towers needed" value={`${fmtN(result.towers)} towers`} />
          <InfoRow label="Max crates/tower" value={result.maxCratesPerTower} />
        </Card>

        {/* Weight */}
        <Card title="Weight">
          <InfoRow label="Product net" value={fmtKg(result.netWeightKg)} />
          <InfoRow label="Crate tare" value={fmtKg(result.crateWeightKg)} />
          <InfoRow label="Total shipment" value={<span className={result.weightFits ? "text-zinc-200" : "text-red-400"}>{fmtKg(result.totalShipmentWeightKg)}</span>} />
          <ProgressBar value={result.totalShipmentWeightKg} max={result.containerMaxPayloadKg} warn={result.totalShipmentWeightKg / result.containerMaxPayloadKg > 0.9} />
        </Card>

        {/* Area & Volume */}
        <Card title="Floor Area & Volume">
          <InfoRow label="Tower footprint" value={`${fmt(result.towerFootprintM2)} m²`} />
          <InfoRow label="Total footprint" value={<span className={result.areaFits ? "text-zinc-200" : "text-red-400"}>{fmt(result.totalFootprintM2)} m²</span>} />
          <ProgressBar value={result.totalFootprintM2} max={result.containerFloorAreaM2} warn={result.totalFootprintM2 / result.containerFloorAreaM2 > 0.9} />
          <div className="mt-3">
            <InfoRow label="Total volume" value={<span className={result.volumeFits ? "text-zinc-200" : "text-red-400"}>{fmt(result.totalVolumeM3)} m³</span>} />
            <ProgressBar value={result.totalVolumeM3} max={result.containerMaxVolumeM3} warn={result.totalVolumeM3 / result.containerMaxVolumeM3 > 0.9} />
          </div>
        </Card>
      </div>

      {/* Max pieces & suggestions */}
      <Card title="Container Capacity">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-zinc-500 mb-1">Max by weight</p>
            <p className="text-lg font-bold text-zinc-100">{fmtN(result.maxByWeight)}</p>
            <p className="text-xs text-zinc-600">pcs</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-1">Max by floor area</p>
            <p className="text-lg font-bold text-zinc-100">{fmtN(result.maxByArea)}</p>
            <p className="text-xs text-zinc-600">pcs</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-1">Max by volume</p>
            <p className="text-lg font-bold text-zinc-100">{fmtN(result.maxByVolume)}</p>
            <p className="text-xs text-zinc-600">pcs</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center gap-3">
          <p className="text-xs text-zinc-500">Max pieces that fit in {result.containerName}:</p>
          <p className="text-sm font-bold text-zinc-100">{fmtN(result.maxPiecesFit)} pcs</p>
          <span className="text-xs text-zinc-600">
            ({result.maxPiecesFit === result.maxByWeight ? "weight limited" :
              result.maxPiecesFit === result.maxByArea ? "area limited" : "volume limited"})
          </span>
        </div>
        {!result.overallFits && (
          <div className="mt-3 p-3 bg-zinc-800 rounded-lg space-y-1.5">
            <p className="text-xs font-medium text-zinc-300">Suggestions:</p>
            <p className="text-xs text-zinc-400">· Reduce quantity to {fmtN(result.maxPiecesFit)} pcs for this container</p>
            {result.containerName === "20ft" && (
              <p className="text-xs text-zinc-400">· Use a 40ft container for larger quantities</p>
            )}
            <p className="text-xs text-zinc-400">· Split into multiple containers if required</p>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Product Info Panel ────────────────────────────────────────────────────────

function ProductInfoPanel({ product }: { product: BladeProductSummary }) {
  return (
    <Card title="Selected Product">
      <InfoRow label="Article code" value={<span className="font-mono">{product.articleCode}</span>} />
      <InfoRow label="Product name" value={product.productName} />
      <InfoRow label="Dimensions" value={`${product.lengthMm.toLocaleString()} × ${product.widthMm} × ${product.thicknessMm} mm`} />
      <InfoRow label="TPI" value={product.tpi} />
      <InfoRow label="Color" value={product.color} />
      <InfoRow label="Crate type" value={product.crateCode} />
      <InfoRow label="Pcs per crate" value={fmtN(product.pcsPerCrate)} />
      <InfoRow label="Max crates / tower" value={product.maxCratesPerTower} />
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PackagingCalculatorPage() {
  const [products, setProducts] = useState<BladeProductSummary[]>([]);
  const [containers, setContainers] = useState<ContainerSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const [articleCode, setArticleCode] = useState("");
  const [qty, setQty] = useState("");
  const [containerName, setContainerName] = useState("");

  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<PackagingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedProduct = products.find((p) => p.articleCode === articleCode) ?? null;

  useEffect(() => {
    getPackagingOptions()
      .then(({ products: p, containers: c }) => {
        setProducts(p);
        setContainers(c);
        if (p.length > 0) setArticleCode(p[0].articleCode);
        if (c.length > 0) setContainerName(c[0].name);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleCalculate() {
    const qtyNum = parseInt(qty, 10);
    if (!articleCode || !qtyNum || qtyNum <= 0 || !containerName) {
      setError("Please fill in all fields with valid values.");
      return;
    }
    setError(null);
    setCalculating(true);
    setResult(null);
    try {
      const r = await runPackagingCalculation(articleCode, qtyNum, containerName);
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Calculation failed");
    } finally {
      setCalculating(false);
    }
  }

  if (loading) {
    return (
      <div className="px-6 py-8 text-xs text-zinc-500">Loading packaging data…</div>
    );
  }

  return (
    <div className="px-6 py-5 space-y-5">

      {/* Input form */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800">
        <div className="px-5 py-3 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-100">Calculate Packaging</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Select article, quantity, and container to calculate fit.</p>
        </div>
        <div className="px-5 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Article code */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Article Code</label>
              <select
                value={articleCode}
                onChange={(e) => { setArticleCode(e.target.value); setResult(null); }}
                className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-3 py-2.5 rounded-lg focus:outline-none focus:border-zinc-500 transition-colors"
              >
                {products.map((p) => (
                  <option key={p.articleCode} value={p.articleCode}>
                    {p.articleCode} — {p.productName}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Quantity (pcs)</label>
              <input
                type="number"
                min={1}
                step={1}
                value={qty}
                onChange={(e) => { setQty(e.target.value); setResult(null); }}
                placeholder="e.g. 150000"
                className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-3 py-2.5 rounded-lg focus:outline-none focus:border-zinc-500 transition-colors placeholder:text-zinc-600"
              />
            </div>

            {/* Container */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Container Type</label>
              <select
                value={containerName}
                onChange={(e) => { setContainerName(e.target.value); setResult(null); }}
                className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-3 py-2.5 rounded-lg focus:outline-none focus:border-zinc-500 transition-colors"
              >
                {containers.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} — {c.lengthMeters}m × {c.widthMeters}m, max {c.maxPayloadKg.toLocaleString()} kg / {c.maxVolumeM3} m³
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleCalculate}
              disabled={calculating || !qty}
              className="flex items-center gap-2 px-5 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-100 text-sm font-medium rounded-lg transition-colors"
            >
              {calculating ? (
                <><span className="w-3.5 h-3.5 border-2 border-zinc-300 border-t-transparent rounded-full animate-spin" /> Calculating…</>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  Calculate
                </>
              )}
            </button>
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>
        </div>
      </div>

      {/* Product info + result side by side when result is available */}
      {selectedProduct && !result && (
        <div className="max-w-sm">
          <ProductInfoPanel product={selectedProduct} />
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Product detail alongside result */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-1">
              <ProductInfoPanel product={selectedProduct!} />
            </div>
            <div className="lg:col-span-3 space-y-4">
              {/* Compact product detail */}
              <Card title="Crate Specification">
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <p className="text-zinc-500 mb-0.5">Crate</p>
                    <p className="text-zinc-200 font-medium">{result.crateCode}</p>
                    <p className="text-zinc-500">{result.crateEmptyWeightKg} kg empty</p>
                  </div>
                  <div>
                    <p className="text-zinc-500 mb-0.5">Dimensions (X×Y×Z)</p>
                    <p className="text-zinc-200 font-mono">{result.crateXm}m × {result.crateYm}m × {result.crateZm}m</p>
                    <p className="text-zinc-500">{fmt(result.volumePerCrateM3, 4)} m³/crate</p>
                  </div>
                  <div>
                    <p className="text-zinc-500 mb-0.5">Empty weight</p>
                    <p className="text-zinc-200 font-medium">{result.crateEmptyWeightKg} kg</p>
                    <p className="text-zinc-500">per empty crate</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
          <ResultPanel result={result} />
        </div>
      )}
    </div>
  );
}
