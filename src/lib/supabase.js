import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)

export const won = (n) => `${Number(n).toLocaleString('ko-KR')}원`
export const dateText = (s) => new Date(s).toLocaleString('ko-KR')
