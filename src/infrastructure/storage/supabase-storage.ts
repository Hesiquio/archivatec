import { createClient } from '@supabase/supabase-js'
import { env } from '../../config/env'

function getSupabaseClient() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    throw new Error('SUPABASE_URL y SUPABASE_SERVICE_KEY son requeridas para subir archivos. Verifica las variables de entorno en Vercel.')
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
}

export const storageService = {
  async createSignedUploadUrl(bucket: string, path: string) {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(path, { upsert: true })

    if (error) throw error
    return data.token
  },

  async fileExists(bucket: string, path: string) {
    const supabase = getSupabaseClient()
    const separator = path.lastIndexOf('/')
    const folder = separator === -1 ? '' : path.slice(0, separator)
    const fileName = path.slice(separator + 1)
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folder, { search: fileName, limit: 100 })

    if (error) throw error
    return data.some((file) => file.name === fileName)
  },

  getPublicUrl(bucket: string, path: string) {
    const supabase = getSupabaseClient()
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)
    return publicUrl
  },

  async deleteFile(bucket: string, path: string) {
    const supabase = getSupabaseClient()
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path])

    if (error) throw error
  }
}
