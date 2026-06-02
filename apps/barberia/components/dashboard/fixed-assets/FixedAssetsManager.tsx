'use client'
// components/dashboard/fixed-assets/FixedAssetsManager.tsx — RF21

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Package,
  Plus,
  X,
  Cpu,
  Sofa,
  Wrench,
  Car,
  Loader2,
  MoreVertical,
  TrendingDown,
  DollarSign,
  BarChart2,
} from 'lucide-react'
import {
  createFixedAsset,
  updateFixedAsset,
  deactivateFixedAsset,
} from '@/actions/fixed-assets'
import type {
  FixedAsset,
  AssetPortfolioSummary,
  FixedAssetCategory,
  DepreciationMethod,
} from '@xinuco/types'

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatCOP(n: number): string {
  return '$' + n.toLocaleString('es-CO')
}

function getCategoryIcon(category: FixedAssetCategory) {
  switch (category) {
    case 'technology': return Cpu
    case 'furniture':  return Sofa
    case 'vehicle':    return Car
    case 'equipment':  return Wrench
    default:           return Package
  }
}

function getCategoryLabel(category: FixedAssetCategory): string {
  switch (category) {
    case 'equipment':  return 'Equipo'
    case 'furniture':  return 'Mueble'
    case 'technology': return 'Tecnología'
    case 'vehicle':    return 'Vehículo'
    default:           return 'Otro'
  }
}

/**
 * Client-side straight-line depreciation estimate for display.
 * Used for immediate feedback without a round-trip to the RPC.
 */
function computeClientSideDepreciation(asset: FixedAsset): {
  currentValue:           number
  accumulatedDepreciation: number
  depreciationPercent:    number
} {
  const purchaseDate = new Date(asset.purchase_date)
  const now          = new Date()
  const monthsElapsedRaw =
    (now.getFullYear() - purchaseDate.getFullYear()) * 12 +
    (now.getMonth() - purchaseDate.getMonth())
  const monthsElapsed    = Math.max(0, Math.min(monthsElapsedRaw, asset.useful_life_months))
  const depreciableAmount = asset.purchase_price - asset.salvage_value

  let currentValue: number
  let accumulatedDepreciation: number

  if (asset.depreciation_method === 'straight_line') {
    const monthlyDep          = Math.floor(depreciableAmount / asset.useful_life_months)
    accumulatedDepreciation   = Math.min(monthlyDep * monthsElapsed, depreciableAmount)
    currentValue              = asset.purchase_price - accumulatedDepreciation
  } else {
    // Declining balance — approximate in JS
    const annualRate  = 2.0 / (asset.useful_life_months / 12.0)
    const monthlyRate = annualRate / 12.0
    let val           = asset.purchase_price
    for (let i = 0; i < monthsElapsed; i++) {
      val = Math.max(Math.floor(val * (1.0 - monthlyRate)), asset.salvage_value)
    }
    currentValue            = val
    accumulatedDepreciation = asset.purchase_price - currentValue
  }

  const depreciationPercent =
    depreciableAmount > 0
      ? Math.min(Math.round((accumulatedDepreciation / depreciableAmount) * 100), 100)
      : 0

  return { currentValue, accumulatedDepreciation, depreciationPercent }
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface FixedAssetsManagerProps {
  assets:     FixedAsset[]
  summary:    AssetPortfolioSummary | null
  businessId: string
  slug:       string
}

// ── Summary Card ──────────────────────────────────────────────────────────────

function SummaryCard({
  icon: Icon,
  label,
  value,
  badge,
}: {
  icon:    React.ElementType
  label:   string
  value:   string
  badge?:  string
}) {
  return (
    <div
      className="rounded-xl px-5 py-4 flex flex-col gap-2 border"
      style={{ backgroundColor: '#111111', borderColor: 'var(--border-color)' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{label}</span>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--primary-color) 12%, transparent)',
          }}
        >
          <Icon size={14} style={{ color: 'var(--primary-color)' }} />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-xl font-bold text-zinc-100">{value}</span>
        {badge && (
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full mb-0.5"
            style={{
              color:           'var(--primary-color)',
              backgroundColor: 'color-mix(in srgb, var(--primary-color) 15%, transparent)',
            }}
          >
            {badge}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Asset Card ────────────────────────────────────────────────────────────────

interface AssetCardProps {
  asset:      FixedAsset
  onEdit:     (asset: FixedAsset) => void
  onDeactivate: (assetId: string) => void
  isDeactivating: boolean
}

function AssetCard({ asset, onEdit, onDeactivate, isDeactivating }: AssetCardProps) {
  const [menuOpen, setMenuOpen]       = useState(false)
  const [confirmDrop, setConfirmDrop] = useState(false)
  const CategoryIcon                  = getCategoryIcon(asset.category)

  const { currentValue, accumulatedDepreciation, depreciationPercent } =
    computeClientSideDepreciation(asset)

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3 border transition-all duration-200"
      style={{ backgroundColor: '#111111', borderColor: 'var(--border-color)' }}
    >
      {/* Row 1: icon + name + menu */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--primary-color) 12%, transparent)',
              border:          '1px solid color-mix(in srgb, var(--primary-color) 22%, transparent)',
            }}
          >
            <CategoryIcon size={16} style={{ color: 'var(--primary-color)' }} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-zinc-100 truncate">{asset.name}</p>
            <p className="text-[11px] text-zinc-500 truncate">
              {getCategoryLabel(asset.category)}
              {asset.location ? ` · ${asset.location}` : ''}
            </p>
          </div>
        </div>

        {/* 3-dot menu */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05] transition-colors"
          >
            <MoreVertical size={15} />
          </button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div
                className="absolute right-0 top-8 z-20 rounded-xl shadow-xl border min-w-[140px] overflow-hidden"
                style={{ backgroundColor: '#1A1A1A', borderColor: 'var(--border-color)' }}
              >
                <button
                  onClick={() => { setMenuOpen(false); onEdit(asset) }}
                  className="w-full text-left text-sm px-4 py-2.5 hover:bg-white/[0.05] transition-colors text-zinc-200"
                >
                  Editar
                </button>
                <button
                  onClick={() => { setMenuOpen(false); setConfirmDrop(true) }}
                  className="w-full text-left text-sm px-4 py-2.5 hover:bg-red-500/10 text-red-400 transition-colors"
                >
                  Dar de baja
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Row 2: purchase info */}
      <div className="flex items-center gap-4 text-[11px] text-zinc-500">
        <span>Compra: {asset.purchase_date}</span>
        <span>Precio: {formatCOP(asset.purchase_price)}</span>
      </div>

      {/* Row 3: current book value */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Valor en libros
          </span>
          <span className="font-bold text-base" style={{ color: 'var(--primary-color)' }}>
            {formatCOP(currentValue)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 items-end">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Depreciado
          </span>
          <span className="text-sm font-semibold text-zinc-300">
            {formatCOP(accumulatedDepreciation)}
          </span>
        </div>
      </div>

      {/* Row 4: progress bar */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-[10px] text-zinc-600">
          <span>Depreciación</span>
          <span>{depreciationPercent}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width:           `${depreciationPercent}%`,
              backgroundColor: depreciationPercent >= 100
                ? '#ef4444'
                : depreciationPercent >= 75
                  ? '#f59e0b'
                  : 'var(--primary-color)',
            }}
          />
        </div>
      </div>

      {/* Confirm deactivation */}
      {confirmDrop && (
        <div
          className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 border"
          style={{ backgroundColor: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.25)' }}
        >
          <span className="text-xs text-red-400">¿Dar de baja este activo?</span>
          <div className="flex gap-2">
            <button
              disabled={isDeactivating}
              onClick={() => { setConfirmDrop(false); onDeactivate(asset.id) }}
              className="text-[11px] font-bold px-3 py-1 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
            >
              {isDeactivating ? <Loader2 size={11} className="animate-spin" /> : 'Confirmar'}
            </button>
            <button
              onClick={() => setConfirmDrop(false)}
              className="text-[11px] px-3 py-1 rounded-lg bg-zinc-700/50 text-zinc-400 hover:bg-zinc-700 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Asset Form Sheet ──────────────────────────────────────────────────────────

interface AssetSheetProps {
  businessId:  string
  slug:        string
  editAsset:   FixedAsset | null
  onClose:     () => void
  onSuccess:   () => void
}

interface AssetFormState {
  name:                string
  category:            FixedAssetCategory
  description:         string
  serial_number:       string
  location:            string
  purchase_date:       string
  purchase_price:      string
  salvage_value:       string
  depreciation_method: DepreciationMethod
  useful_life_months:  string
}

const EMPTY_FORM: AssetFormState = {
  name:                '',
  category:            'equipment',
  description:         '',
  serial_number:       '',
  location:            '',
  purchase_date:       new Date().toISOString().slice(0, 10),
  purchase_price:      '',
  salvage_value:       '0',
  depreciation_method: 'straight_line',
  useful_life_months:  '60',
}

function assetToFormState(asset: FixedAsset): AssetFormState {
  return {
    name:                asset.name,
    category:            asset.category,
    description:         asset.description         ?? '',
    serial_number:       asset.serial_number       ?? '',
    location:            asset.location            ?? '',
    purchase_date:       asset.purchase_date,
    purchase_price:      String(asset.purchase_price),
    salvage_value:       String(asset.salvage_value),
    depreciation_method: asset.depreciation_method,
    useful_life_months:  String(asset.useful_life_months),
  }
}

function AssetSheet({ businessId, slug, editAsset, onClose, onSuccess }: AssetSheetProps) {
  const [form, setForm]           = useState<AssetFormState>(
    editAsset ? assetToFormState(editAsset) : EMPTY_FORM
  )
  const [error, setError]         = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const formRef                   = React.useRef<HTMLFormElement>(null)

  const inputCls =
    'w-full rounded-xl px-3 py-2.5 text-sm border outline-none transition-colors placeholder-zinc-600'
  const inputStyle = {
    backgroundColor: 'var(--bg-color)',
    borderColor:     'var(--border-color)',
    color:           'var(--text-color, #F4F4F4)',
  }
  const labelCls = 'text-xs font-semibold text-zinc-500 uppercase tracking-wide'

  const set = (key: keyof AssetFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [key]: e.target.value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const purchase_price     = Math.floor(Number(form.purchase_price))
    const salvage_value      = Math.floor(Number(form.salvage_value))
    const useful_life_months = Math.floor(Number(form.useful_life_months))

    if (!form.name.trim())         { setError('El nombre es requerido.');              return }
    if (!form.purchase_date)       { setError('La fecha de compra es requerida.');     return }
    if (!purchase_price || purchase_price <= 0) {
      setError('El precio de compra debe ser mayor a 0.')
      return
    }
    if (salvage_value < 0)         { setError('El valor residual no puede ser negativo.'); return }
    if (!useful_life_months || useful_life_months <= 0) {
      setError('La vida útil debe ser mayor a 0.')
      return
    }

    startTransition(async () => {
      const input = {
        name:                form.name.trim(),
        category:            form.category,
        description:         form.description.trim()   || null,
        serial_number:       form.serial_number.trim() || null,
        location:            form.location.trim()      || null,
        purchase_date:       form.purchase_date,
        purchase_price,
        salvage_value,
        depreciation_method: form.depreciation_method,
        useful_life_months,
        created_by:          null,
      }

      let result: { success?: boolean; error?: string }

      if (editAsset) {
        result = await updateFixedAsset(businessId, editAsset.id, input, slug)
      } else {
        result = await createFixedAsset(businessId, input, slug)
      }

      if (result.error) {
        setError(result.error)
      } else {
        onSuccess()
        onClose()
      }
    })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 h-full z-50 w-full max-w-md flex flex-col shadow-2xl"
        style={{ backgroundColor: 'var(--bg-color)', borderLeft: '1px solid var(--border-color)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'color-mix(in srgb, var(--primary-color) 15%, transparent)' }}
            >
              <Package size={16} style={{ color: 'var(--primary-color)' }} />
            </div>
            <span className="font-semibold text-sm text-zinc-100">
              {editAsset ? 'Editar activo' : 'Agregar activo'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-5 flex flex-col gap-4"
        >
          {/* Nombre */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>
              Nombre del activo <span className="text-red-400">*</span>
            </label>
            <input
              className={inputCls}
              style={inputStyle}
              placeholder="Ej: Silla hidráulica Takara"
              value={form.name}
              onChange={set('name')}
              autoFocus
            />
          </div>

          {/* Categoría */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Categoría</label>
            <select
              className={inputCls}
              style={inputStyle}
              value={form.category}
              onChange={set('category')}
            >
              <option value="equipment">Equipo</option>
              <option value="furniture">Mueble</option>
              <option value="technology">Tecnología</option>
              <option value="vehicle">Vehículo</option>
              <option value="other">Otro</option>
            </select>
          </div>

          {/* Descripción */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>
              Descripción{' '}
              <span className="text-zinc-600 font-normal normal-case">(opcional)</span>
            </label>
            <textarea
              className={`${inputCls} resize-none`}
              style={inputStyle}
              rows={2}
              placeholder="Descripción del activo..."
              value={form.description}
              onChange={set('description')}
            />
          </div>

          {/* Serial + Ubicación */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>
                N.° serie{' '}
                <span className="text-zinc-600 font-normal normal-case">(opcional)</span>
              </label>
              <input
                className={inputCls}
                style={inputStyle}
                placeholder="SN-00001"
                value={form.serial_number}
                onChange={set('serial_number')}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>
                Ubicación{' '}
                <span className="text-zinc-600 font-normal normal-case">(opcional)</span>
              </label>
              <input
                className={inputCls}
                style={inputStyle}
                placeholder="Piso 1"
                value={form.location}
                onChange={set('location')}
              />
            </div>
          </div>

          {/* Fecha de compra */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>
              Fecha de compra <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              className={inputCls}
              style={inputStyle}
              value={form.purchase_date}
              onChange={set('purchase_date')}
            />
          </div>

          {/* Precio de compra + Valor residual */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>
                Precio de compra <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min={1}
                step={1}
                className={inputCls}
                style={inputStyle}
                placeholder="2500000"
                value={form.purchase_price}
                onChange={set('purchase_price')}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Valor residual COP</label>
              <input
                type="number"
                min={0}
                step={1}
                className={inputCls}
                style={inputStyle}
                placeholder="0"
                value={form.salvage_value}
                onChange={set('salvage_value')}
              />
            </div>
          </div>

          {/* Método de depreciación */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Método de depreciación</label>
            <select
              className={inputCls}
              style={inputStyle}
              value={form.depreciation_method}
              onChange={set('depreciation_method')}
            >
              <option value="straight_line">Línea Recta</option>
              <option value="declining_balance">Saldo Decreciente</option>
            </select>
          </div>

          {/* Vida útil */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Vida útil en meses</label>
            <input
              type="number"
              min={1}
              step={1}
              className={inputCls}
              style={inputStyle}
              placeholder="60"
              value={form.useful_life_months}
              onChange={set('useful_life_months')}
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
          )}
        </form>

        {/* Footer */}
        <div
          className="px-5 py-4 border-t flex gap-3"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
            style={{ borderColor: 'var(--border-color)' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => formRef.current?.requestSubmit()}
            disabled={isPending}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100"
            style={{ backgroundColor: 'var(--primary-color)', color: '#080808' }}
          >
            {isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Plus size={14} />
            )}
            {editAsset ? 'Guardar cambios' : 'Agregar activo'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function FixedAssetsManager({
  assets: initialAssets,
  summary,
  businessId,
  slug,
}: FixedAssetsManagerProps) {
  const router                                  = useRouter()
  const [assets, setAssets]                     = useState<FixedAsset[]>(initialAssets)
  const [showSheet, setShowSheet]               = useState(false)
  const [editingAsset, setEditingAsset]         = useState<FixedAsset | null>(null)
  const [deactivatingId, setDeactivatingId]     = useState<string | null>(null)
  const [, startTransition]                     = useTransition()

  const depreciationPct =
    summary && summary.total_purchase_price > 0
      ? Math.round(
          (summary.total_depreciation /
            (summary.total_purchase_price - (summary.total_book_value < summary.total_purchase_price
              ? 0
              : 0))) *
            100
        )
      : 0

  const depPct =
    summary && summary.total_purchase_price > 0
      ? Math.min(
          Math.round((summary.total_depreciation / summary.total_purchase_price) * 100),
          100
        )
      : 0

  const handleDeactivate = (assetId: string) => {
    setDeactivatingId(assetId)
    startTransition(async () => {
      try {
        await deactivateFixedAsset(businessId, assetId, slug)
        setAssets((prev) => prev.filter((a) => a.id !== assetId))
        router.refresh()
      } finally {
        setDeactivatingId(null)
      }
    })
  }

  const handleEdit = (asset: FixedAsset) => {
    setEditingAsset(asset)
    setShowSheet(true)
  }

  const handleCloseSheet = () => {
    setShowSheet(false)
    setEditingAsset(null)
  }

  const handleSuccess = () => {
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6 pt-6">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--primary-color) 12%, transparent)',
              border:          '1px solid color-mix(in srgb, var(--primary-color) 25%, transparent)',
            }}
          >
            <Package size={22} style={{ color: 'var(--primary-color)' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif font-bold text-xl text-zinc-100">Activos Fijos</h1>
              {assets.length > 0 && (
                <span
                  className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    color:           'var(--primary-color)',
                    backgroundColor: 'color-mix(in srgb, var(--primary-color) 15%, transparent)',
                  }}
                >
                  {assets.length} activo{assets.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Inventario y depreciación de equipos del negocio
            </p>
          </div>
        </div>

        <button
          onClick={() => { setEditingAsset(null); setShowSheet(true) }}
          className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl transition-all hover:scale-105 flex-shrink-0"
          style={{ backgroundColor: 'var(--primary-color)', color: '#080808' }}
        >
          <Plus size={15} />
          <span className="hidden sm:inline">Agregar Activo</span>
          <span className="sm:hidden">Agregar</span>
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryCard
            icon={DollarSign}
            label="Valor en Libros"
            value={formatCOP(summary.total_book_value)}
          />
          <SummaryCard
            icon={BarChart2}
            label="Inversión Total"
            value={formatCOP(summary.total_purchase_price)}
          />
          <SummaryCard
            icon={TrendingDown}
            label="Depreciación Acumulada"
            value={formatCOP(summary.total_depreciation)}
            badge={`${depPct}%`}
          />
        </div>
      )}

      {/* Asset List or Empty State */}
      {assets.length === 0 ? (
        <div
          className="rounded-2xl flex flex-col items-center justify-center gap-4 py-16 border"
          style={{ backgroundColor: '#111111', borderColor: 'var(--border-color)' }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--primary-color) 10%, transparent)',
              border:          '1px solid color-mix(in srgb, var(--primary-color) 20%, transparent)',
            }}
          >
            <Package size={32} style={{ color: 'var(--primary-color)', opacity: 0.6 }} />
          </div>
          <div className="text-center">
            <p className="font-semibold text-zinc-200">No hay activos registrados</p>
            <p className="text-sm text-zinc-500 mt-1">
              Agrega tu primer activo fijo para llevar el control de depreciación
            </p>
          </div>
          <button
            onClick={() => { setEditingAsset(null); setShowSheet(true) }}
            className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all hover:scale-105"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--primary-color) 15%, transparent)',
              color:           'var(--primary-color)',
              border:          '1px solid color-mix(in srgb, var(--primary-color) 25%, transparent)',
            }}
          >
            <Plus size={14} />
            Agregar activo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {assets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onEdit={handleEdit}
              onDeactivate={handleDeactivate}
              isDeactivating={deactivatingId === asset.id}
            />
          ))}
        </div>
      )}

      {/* Add / Edit Sheet */}
      {showSheet && (
        <AssetSheet
          businessId={businessId}
          slug={slug}
          editAsset={editingAsset}
          onClose={handleCloseSheet}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
