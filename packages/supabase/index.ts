/**
 * @xinuco/supabase — Clientes Supabase compartidos para la plataforma Xinuco.
 *
 * Exports:
 *  - createClient()        → cliente browser (CSR)
 *  - createClient()        → cliente servidor con cookies (SSR)  [desde '/server']
 *  - createAdminClient()   → cliente service-role (server-only)  [desde '/server']
 *  - updateSession()       → middleware multi-tenant Zero-DB     [desde '/middleware']
 *
 * Uso en apps:
 *   import { createClient } from '@xinuco/supabase/server'
 *   import { createClient } from '@xinuco/supabase/client'
 *   import { updateSession } from '@xinuco/supabase/middleware'
 */
export { createClient as createBrowserClient } from './client'
