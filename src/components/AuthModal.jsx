import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthModal({ onClose }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setMsg('')
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMsg(error.message)
      else onClose()
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      })
      if (error) setMsg(error.message)
      else if (data.session) onClose()
      else setMsg('가입 확인 메일을 보냈습니다. 메일의 링크를 누른 뒤 로그인해 주세요.')
    }
    setBusy(false)
  }

  return (
    <div className="overlay" onClick={onClose}>
      <form className="modal small" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>{mode === 'login' ? '로그인' : '회원가입'}</h2>
        {mode === 'signup' && (
          <input placeholder="이름(닉네임)" value={name} onChange={(e) => setName(e.target.value)} required />
        )}
        <input type="email" placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input
          type="password"
          placeholder="비밀번호 (6자 이상)"
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {msg && <p className="msg">{msg}</p>}
        <button className="primary" disabled={busy}>
          {mode === 'login' ? '로그인' : '가입하기'}
        </button>
        <button type="button" className="link" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
          {mode === 'login' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있어요. 로그인'}
        </button>
      </form>
    </div>
  )
}
