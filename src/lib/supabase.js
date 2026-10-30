import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const configured = Boolean(url && key)

// 키가 비어 있어도 앱이 죽지 않도록 자리표시 값을 쓰고, 화면에서 안내합니다.
export const supabase = createClient(url || 'http://localhost', key || 'missing-key')

export const won = (n) => `${Number(n).toLocaleString('ko-KR')}원`
export const dateText = (s) => new Date(s).toLocaleString('ko-KR')
