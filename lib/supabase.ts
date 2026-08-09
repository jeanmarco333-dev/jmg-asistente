import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_GRUPO_ESTAR_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_GRUPO_ESTAR_SUPABASE_KEY

if (!url || !key) {
  throw new Error("Faltan las variables de entorno de Supabase de Grupo Estar")
}

export const supabase = createClient(url, key)
