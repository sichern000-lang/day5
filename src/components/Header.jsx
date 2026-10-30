import { useAuth } from '../AuthContext'
import { supabase } from '../lib/supabase'

const TABS = [
  ['shop', '🍊 특산물'],
  ['cart', '🛒 장바구니'],
  ['orders', '📦 주문내역'],
  ['guestbook', '📖 방명록'],
]

export default function Header({ page, setPage, onLogin }) {
  const { user, name } = useAuth()
  return (
    <header className="header">
      <h1>🌴 제주 마켓</h1>
      <nav>
        {TABS.map(([key, label]) => (
          <button key={key} className={page === key ? 'tab active' : 'tab'} onClick={() => setPage(key)}>
            {label}
          </button>
        ))}
      </nav>
      <div className="user">
        {user ? (
          <>
            <span>{name}님</span>
            <button onClick={() => supabase.auth.signOut()}>로그아웃</button>
          </>
        ) : (
          <button className="primary" onClick={onLogin}>
            로그인 / 회원가입
          </button>
        )}
      </div>
    </header>
  )
}
