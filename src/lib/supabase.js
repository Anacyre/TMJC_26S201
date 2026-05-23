import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// UniApp cross-platform storage adapter (H5 / mini programs / App)
const uniStorage = {
  getItem: (key) => {
    try {
      const val = uni.getStorageSync(key)
      return val === '' ? null : val
    } catch {
      return null
    }
  },
  setItem: (key, value) => {
    try {
      uni.setStorageSync(key, value)
    } catch {}
  },
  removeItem: (key) => {
    try {
      uni.removeStorageSync(key)
    } catch {}
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: uniStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
