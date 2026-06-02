'use client'

import { useState } from 'react'
import { NewBusinessModal } from '@/components/admin/NewBusinessModal'
import { Plus } from 'lucide-react'

/**
 * TenantActions — Client Component encargado del botón + modal.
 * Separado para no forzar al page.tsx a ser 'use client'.
 */
export function TenantActions() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        id="btn-new-tenant"
        onClick={() => setIsOpen(true)}
        className="btn-primary !px-4 !py-2.5"
      >
        <Plus size={15} />
        Nueva Barbería
      </button>

      <NewBusinessModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}
