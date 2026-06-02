# Xinuco — Monorepo

Plataforma SaaS multi-vertical. **Un repo, cada proyecto físicamente separado** para aislar el contexto de Claude Code.

## Estructura
| Carpeta | Qué es | Supabase |
|---|---|---|
| `apps/web` | Plataforma: landing `xinuco.com/` + `/admin` (admin GENERAL de todas las verticales) | CONTROL |
| `apps/barberia` | Vertical Barbería: `/adminbarberia` (consola de vertical) + `/[slug]` (back-office de cada negocio) | BARBERÍA |
| `packages/*` | Código compartido (Fase 2 — stubs por ahora) | — |
| `templates/siguiente-vertical` | Esqueleto copiable para crear una nueva vertical | — |

## Regla de oro — Contexto de Claude Code
**Para trabajar en una vertical, abre Claude con el `cwd` DENTRO de su app:**
```
# Trabajar en barbería:
cd apps/barberia   ← Claude carga apps/barberia/CLAUDE.md únicamente

# Trabajar en la plataforma/web:
cd apps/web        ← Claude carga apps/web/CLAUDE.md únicamente
```
No edites otras apps salvo cambios transversales en `packages/*`.

## Comandos (npm workspaces + Turborepo)
```bash
# Instalar (siempre desde la raíz)
npm install

# Dev — cada app en su puerto
turbo run dev --filter=web       # puerto 3000
turbo run dev --filter=barberia  # puerto 3001
turbo run dev                    # ambas en paralelo

# Build, lint, test por app
turbo run build --filter=barberia
turbo run test  --filter=web
turbo run lint  --filter=barberia

# Solo lo afectado desde el último commit
turbo run build --filter=...[HEAD^1]
```

## Convenciones
- Alias `@/*` = raíz de **cada app** (no del monorepo). Lo compartido se importa como `@xinuco/<paquete>` (Fase 2).
- Server Actions (`'use server'`) viven DENTRO de cada app; nunca en `packages/`.
- Una Supabase por vertical. El super_admin se autentica contra CONTROL y tiene SSO bajo `xinuco.com`.
- Fase 1: las apps comparten la misma base Supabase. El split físico es Fase 4.

## Doble Admin
| URL | App | Descripción |
|---|---|---|
| `xinuco.com/admin` | `apps/web` | Admin GENERAL — gestiona negocios de TODAS las verticales |
| `xinuco.com/adminbarberia` | `apps/barberia` | Consola BARBERÍA — gestiona las barberías en la base de barbería |

Mismo `super_admin` (una sola cuenta). SSO por cookies del mismo dominio `xinuco.com`.

## Roadmap de fases
- ✅ **Fase 1** — Monorepo + doble admin + CLAUDE.md por app
- 🔲 **Fase 2** — Extraer `packages/*` reales (supabase, types, ui, utils, billing-catalog) y actualizar imports
- 🔲 **Fase 3** — Scaffolding de nuevas verticales desde `templates/siguiente-vertical`
- 🔲 **Fase 4** — Split físico de Supabase por vertical (CONTROL + BARBERÍA)
