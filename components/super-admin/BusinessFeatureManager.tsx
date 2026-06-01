'use client'
// ============================================================
// components/super-admin/BusinessFeatureManager.tsx
// Feature management UI for a single business.
// ============================================================

import { useState, useTransition } from 'react'
import {
  Mail, MessageCircle, Percent, Wallet, Receipt, ShoppingBag,
  Gift, LayoutGrid, Users, BookUser, Shield, Package, Archive,
  BarChart2, Check, type LucideIcon,
} from 'lucide-react'
import { FEATURE_CATALOG, PLAN_BUNDLES, detectCurrentPlan } from '@/lib/features/config'
import { updateBusinessFeatures, applyPlan } from '@/actions/super-admin'
import type { BusinessFeatures } from '@/types/database'
import type { PlanName, FeatureCategory } from '@/lib/features/config'

// ── Icon map ──────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  Mail, MessageCircle, Percent, Wallet, Receipt, ShoppingBag,
  Gift, LayoutGrid, Users, BookUser, Shield, Package, Archive, BarChart2,
}

// ── Category labels ───────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<FeatureCategory, string> = {
  comunicacion: 'Comunicación',
  finanzas:     'Finanzas',
  operaciones:  'Operaciones',
  compliance:   'Compliance',
}

const CATEGORY_ORDER: FeatureCategory[] = ['comunicacion', 'finanzas', 'operaciones', 'compliance']

// ── Toggle switch ─────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked:  boolean
  onChange: (v: boolean) => void
  disabled: boolean
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background: checked
          ? 'color-mix(in srgb, #C5A059 80%, transparent)'
          : 'rgba(255,255,255,0.12)',
        boxShadow: checked
          ? '0 0 8px color-mix(in srgb, #C5A059 40%, transparent)'
          : 'none',
      }}
    >
      <span
        className="inline-block h-4 w-4 rounded-full shadow transition-transform"
        style={{
          background:  checked ? '#C5A059' : 'rgba(244,244,244,0.65)',
          transform:   checked ? 'translateX(24px)' : 'translateX(4px)',
          boxShadow:   checked ? '0 0 6px #C5A059' : 'none',
        }}
      />
    </button>
  )
}

// ── Plan button ───────────────────────────────────────────────────────────────

const PLAN_STYLES: Record<PlanName, { border: string; bg: string; text: string; activeBg: string }> = {
  esencial:    { border: 'rgba(161,161,170,0.25)',  bg: 'transparent',            text: '#a1a1aa', activeBg: 'rgba(161,161,170,0.12)' },
  profesional: { border: 'rgba(59,130,246,0.30)',   bg: 'transparent',            text: '#93c5fd', activeBg: 'rgba(59,130,246,0.12)'  },
  elite:       { border: 'rgba(197,160,89,0.40)',   bg: 'transparent',            text: '#C5A059', activeBg: 'rgba(197,160,89,0.15)'  },
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface BusinessFeatureManagerProps {
  businessId:      string
  businessName:    string
  initialFeatures: BusinessFeatures
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BusinessFeatureManager({
  businessId,
  businessName,
  initialFeatures,
}: BusinessFeatureManagerProps) {
  const [features, setFeatures]     = useState<BusinessFeatures>(initialFeatures)
  const [dirty, setDirty]           = useState(false)
  const [toast, setToast]           = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const currentPlan = detectCurrentPlan(features)

  // ── helpers ────────────────────────────────────────────────────────────────

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3500)
  }

  function toggleFeature(key: keyof BusinessFeatures, value: boolean) {
    setFeatures((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  function handleApplyPlan(plan: PlanName) {
    const bundle = PLAN_BUNDLES[plan]
    const merged: BusinessFeatures = { ...features, ...(bundle.features as Partial<BusinessFeatures>) }
    setFeatures(merged)
    setDirty(true)
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateBusinessFeatures(businessId, features)
      if (result.success) {
        setDirty(false)
        showToast('success', 'Cambios guardados correctamente.')
      } else {
        showToast('error', result.error ?? 'Error desconocido.')
      }
    })
  }

  function handleApplyPlanRemote(plan: PlanName) {
    startTransition(async () => {
      handleApplyPlan(plan)
      const result = await applyPlan(businessId, plan)
      if (result.success) {
        setDirty(false)
        showToast('success', `Plan ${PLAN_BUNDLES[plan].label} aplicado.`)
      } else {
        showToast('error', result.error ?? 'Error al aplicar el plan.')
      }
    })
  }

  // Group features by category
  const byCategory: Record<FeatureCategory, (keyof BusinessFeatures)[]> = {
    comunicacion: [],
    finanzas:     [],
    operaciones:  [],
    compliance:   [],
  }
  for (const key of Object.keys(FEATURE_CATALOG) as (keyof BusinessFeatures)[]) {
    byCategory[FEATURE_CATALOG[key].category].push(key)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium shadow-xl animate-fade-in"
          style={{
            background:  toast.type === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
            border:      `1px solid ${toast.type === 'success' ? 'rgba(34,197,94,0.30)' : 'rgba(239,68,68,0.30)'}`,
            color:       toast.type === 'success' ? '#4ade80' : '#f87171',
          }}
        >
          {toast.type === 'success' ? <Check size={15} /> : null}
          {toast.msg}
        </div>
      )}

      {/* Plan selector + current badge */}
      <div
        className="rounded-2xl p-5 flex flex-col gap-4"
        style={{ border: '1px solid rgba(197,160,89,0.12)', background: 'rgba(255,255,255,0.02)' }}
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-sm font-semibold" style={{ color: '#F4F4F4' }}>Plan del negocio</h2>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(244,244,244,0.40)' }}>
              Aplica un bundle para activar/desactivar un conjunto predefinido de funciones.
            </p>
          </div>
          {/* Current plan badge */}
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background: currentPlan === 'custom' ? 'rgba(168,85,247,0.15)' : PLAN_STYLES[currentPlan as PlanName].activeBg,
              color:      currentPlan === 'custom' ? '#d8b4fe'               : PLAN_STYLES[currentPlan as PlanName].text,
              border:     `1px solid ${currentPlan === 'custom' ? 'rgba(168,85,247,0.30)' : PLAN_STYLES[currentPlan as PlanName].border}`,
            }}
          >
            Plan actual:{' '}
            {currentPlan === 'custom' ? 'Personalizado' : PLAN_BUNDLES[currentPlan].label}
          </span>
        </div>

        {/* Plan buttons */}
        <div className="flex flex-wrap gap-3">
          {(Object.keys(PLAN_BUNDLES) as PlanName[]).map((plan) => {
            const bundle  = PLAN_BUNDLES[plan]
            const style   = PLAN_STYLES[plan]
            const isActive = currentPlan === plan
            return (
              <button
                key={plan}
                onClick={() => handleApplyPlanRemote(plan)}
                disabled={isPending}
                className="flex flex-col gap-0.5 px-4 py-3 rounded-xl text-left transition-all hover:scale-[1.02] active:scale-100 disabled:opacity-50"
                style={{
                  border:     `1px solid ${style.border}`,
                  background: isActive ? style.activeBg : 'transparent',
                  color:      style.text,
                  minWidth:   '120px',
                }}
              >
                <span className="font-semibold text-sm">{bundle.label}</span>
                <span className="text-xs opacity-70 leading-snug">{bundle.description}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Feature toggles by category */}
      {CATEGORY_ORDER.map((category) => {
        const keys = byCategory[category]
        if (keys.length === 0) return null
        return (
          <div
            key={category}
            className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(197,160,89,0.10)' }}
          >
            {/* Category header */}
            <div
              className="px-5 py-3 text-xs font-semibold uppercase tracking-wider"
              style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(244,244,244,0.40)', borderBottom: '1px solid rgba(197,160,89,0.08)' }}
            >
              {CATEGORY_LABELS[category]}
            </div>

            {/* Feature rows */}
            {keys.map((featureKey, idx) => {
              const meta    = FEATURE_CATALOG[featureKey]
              const Icon    = ICON_MAP[meta.icon] ?? Shield
              const enabled = features[featureKey]

              return (
                <div
                  key={featureKey}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.02]"
                  style={{ borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.04)' : undefined }}
                >
                  {/* Icon */}
                  <div
                    className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center"
                    style={{
                      background: enabled
                        ? 'color-mix(in srgb, #C5A059 12%, transparent)'
                        : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${enabled ? 'color-mix(in srgb, #C5A059 25%, transparent)' : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    <Icon
                      size={16}
                      style={{ color: !!(features as unknown as Record<string, boolean>)?.[featureKey] ? '#C5A059' : 'rgba(244,244,244,0.30)' }}
                    />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium"
                      style={{ color: enabled ? '#F4F4F4' : 'rgba(244,244,244,0.50)' }}
                    >
                      {meta.label}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(244,244,244,0.35)' }}>
                      {meta.description}
                    </p>
                  </div>

                  {/* Toggle */}
                  <Toggle
                    checked={!!enabled}
                    onChange={(v) => toggleFeature(featureKey, v)}
                    disabled={isPending}
                  />
                </div>
              )
            })}
          </div>
        )
      })}

      {/* Save bar */}
      <div
        className="sticky bottom-4 flex items-center justify-between gap-4 rounded-2xl px-5 py-4 transition-all"
        style={{
          background: dirty ? 'rgba(13,13,13,0.95)' : 'rgba(13,13,13,0.70)',
          border:     `1px solid ${dirty ? 'rgba(197,160,89,0.30)' : 'rgba(255,255,255,0.06)'}`,
          backdropFilter: 'blur(12px)',
        }}
      >
        <span
          className="text-sm"
          style={{ color: dirty ? 'rgba(197,160,89,0.90)' : 'rgba(244,244,244,0.35)' }}
        >
          {dirty ? 'Tienes cambios sin guardar' : `${Object.values(features).filter(Boolean).length} de ${Object.keys(FEATURE_CATALOG).length} funciones activas`}
        </span>

        <button
          onClick={handleSave}
          disabled={!dirty || isPending}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.03] active:scale-100 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: 'color-mix(in srgb, #C5A059 90%, transparent)',
            color:      '#080808',
          }}
        >
          {isPending ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}
