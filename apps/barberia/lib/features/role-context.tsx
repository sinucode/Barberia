'use client'
// ============================================================
// lib/features/role-context.tsx — React Context for user roles
// Injected from DashboardLayout (Server Component).
// Accessible in any Client Component via useRole() / useIsAdmin().
// ============================================================

import { createContext, useContext } from 'react'
import type { UserRole } from '@xinuco/types'

const RoleContext = createContext<UserRole>('barber')

export function RoleProvider({
  role,
  children,
}: {
  role: UserRole
  children: React.ReactNode
}) {
  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>
}

export function useRole(): UserRole {
  return useContext(RoleContext)
}

export function useIsAdmin(): boolean {
  const role = useRole()
  return role === 'admin' || role === 'super_admin'
}
