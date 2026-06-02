// scripts/upload-to-supabase.mjs
// Sube las imágenes de la landing a Supabase Storage (bucket: assets)
// Run: node scripts/upload-to-supabase.mjs
//
// Lee las credenciales desde .env.local — NUNCA hardcodear secrets aquí.

import { createClient } from '@supabase/supabase-js'
import { readFileSync }  from 'fs'
import { resolve }       from 'path'
import { config }        from 'dotenv'

// Cargar .env.local automáticamente
config({ path: '.env.local' })

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET           = 'assets'

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌  Faltan variables de entorno. Verifica .env.local:')
  console.error('    NEXT_PUBLIC_SUPABASE_URL')
  console.error('    SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const IMAGES = [
  { local: 'public/xinuco-isotipo.png',   remote: 'landing/xinuco-isotipo.png'  },
  { local: 'public/xinuco-splash.png',    remote: 'landing/xinuco-splash.png'   },
  { local: 'public/xinuco-app-icon.png',  remote: 'landing/xinuco-app-icon.png' },
]

async function run() {
  // 1. Crear bucket si no existe
  console.log(`\n📦  Verificando bucket "${BUCKET}"...`)
  const { data: buckets } = await supabase.storage.listBuckets()
  const exists = buckets?.some(b => b.id === BUCKET)

  if (!exists) {
    const { error } = await supabase.storage.createBucket(BUCKET, {
      public:           true,
      fileSizeLimit:    5 * 1024 * 1024,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
    })
    if (error) { console.error('❌  Error creando bucket:', error.message); process.exit(1) }
    console.log(`✅  Bucket "${BUCKET}" creado (público).`)
  } else {
    console.log(`✅  Bucket "${BUCKET}" ya existe.`)
  }

  // 2. Subir cada imagen
  for (const img of IMAGES) {
    const filePath = resolve(img.local)
    let buffer
    try {
      buffer = readFileSync(filePath)
    } catch {
      console.warn(`⚠️   No se encontró ${img.local} — omitiendo.`)
      continue
    }

    console.log(`\n⬆️   Subiendo ${img.local} → ${BUCKET}/${img.remote}`)
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(img.remote, buffer, { contentType: 'image/png', upsert: true })

    if (error) { console.error(`❌  Error: ${error.message}`); continue }

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(img.remote)
    console.log(`✅  URL pública: ${publicUrl}`)
  }

  console.log('\n🎉  Listo.\n')
}

run().catch(console.error)
