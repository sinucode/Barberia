# Plantilla · Nueva Vertical Xinuco

> ⚠️ **NO editar aquí directamente. COPIAR primero a `apps/<vertical>`.**  
> Esta carpeta es solo fuente de copia, no se construye ni despliega.

## Cómo instanciar una nueva vertical

### 1. Copiar la plantilla
```bash
cp -r templates/siguiente-vertical apps/<vertical>
# Ejemplo: cp -r templates/siguiente-vertical apps/creditos
```

### 2. Reemplazar los placeholders en TODOS los archivos
| Placeholder | Reemplazar por | Ejemplo |
|---|---|---|
| `__VERTICAL__` | nombre en minúsculas | `creditos` |
| `__VERTICAL_TITULO__` | nombre con mayúscula | `Créditos` |
| `__ADMIN_PATH__` | ruta del admin `/admin<vertical>` | `admincreditos` |
| `@xinuco/__VERTICAL__` | nombre del paquete npm | `@xinuco/creditos` |

```bash
# macOS / Linux — reemplazar en todos los archivos:
cd apps/creditos
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.json" -o -name "*.md" -o -name "*.mjs" \) \
  -exec sed -i '' 's/__VERTICAL__/creditos/g; s/__VERTICAL_TITULO__/Créditos/g; s/__ADMIN_PATH__/admincreditos/g' {} +
```

### 3. Renombrar la carpeta del admin
```bash
mv "app/admin__VERTICAL__" "app/admin<vertical>"
# Ejemplo: mv "app/admin__VERTICAL__" "app/admincreditos"
```

### 4. Crear proyecto Supabase y .env.local
```bash
cp .env.example .env.local
# Rellenar las credenciales del nuevo proyecto Supabase
```

### 5. Registrar la vertical en apps/web
- Añadir una tarjeta en `apps/web/components/landing/XinucoLanding.tsx` → array `VERTICALES`.
- (Fase 4) Añadir fila con `vertical = '__VERTICAL__'` en la tabla `businesses` de CONTROL.

### 6. Montar en el dominio
- Añadir regla de rewrite en `apps/barberia/next.config.mjs` (o configurar como zona adicional).
- Decisión de routing: `/admin<vertical>` como nueva zona, o sub-ruta de la zona raíz.

### 7. Renombrar este CLAUDE.md
```bash
# Actualizar el contenido con el contexto real de la vertical
nano apps/<vertical>/CLAUDE.md
```

---

## Qué incluye esta plantilla
- `app/admin__VERTICAL__/login/` — login del super_admin para la vertical
- `app/admin__VERTICAL__/(dashboard)/` — consola de la vertical (placeholder)
- `app/[slug]/dashboard/` — back-office básico del tenant (placeholder)
- `middleware.ts` — multi-tenant Zero-DB (copia de barbería, sin lógica específica)
- `next.config.mjs` — placeholder de next config
- `package.json` — con nombre `@xinuco/__VERTICAL__` y deps a packages/*
- `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`
- `.env.example` — credenciales de Supabase de la vertical
- `supabase/migrations/.gitkeep` — para el esquema propio de la vertical

## Convenciones heredadas (de barbería — copiar al instanciar)
- Multi-tenant por `business_id` + RLS sobre `auth.jwt()`.
- Slug inyectado por RPC `secure_set_user_context` en `app_metadata`.
- Super_admin se autentica contra Supabase CONTROL (SSO).
- `@/*` alias apunta a la raíz de ESTA app.
