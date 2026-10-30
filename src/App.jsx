import { useState } from 'react'
import './App.css'
import { AuthProvider } from './AuthContext'
import { ShopProvider } from './ShopContext'
import Header from './components/Header'
import Home from './components/Home'
import Wishlist from './components/Wishlist'
import Cart from './components/Cart'
import CartDrawer from './components/CartDrawer'
import Orders from './components/Orders'
import Review from './components/Review'
import AuthModal from './components/AuthModal'
import { configured } from './lib/supabase'

function App() {
  const [page, setPageState] = useState('home')
  const [showAuth, setShowAuth] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [reviewProduct, setReviewProduct] = useState(null)
  const [toast, setToast] = useState('')

  if (!configured) {
    return (
      <main className="section">
        <h2>Supabase 설정이 필요합니다</h2>
        <p>
          <code>.env.local</code>에 <code>VITE_SUPABASE_URL</code>과 <code>VITE_SUPABASE_ANON_KEY</code> 값을 채운 뒤
          개발 서버를 다시 시작하세요.
        </p>
      </main>
    )
  }

  const notify = (m) => {
    setToast(m)
    setTimeout(() => setToast(''), 2500)
  }
  const login = () => {
    setCartOpen(false)
    setShowAuth(true)
  }
  const setPage = (p) => {
    setPageState(p)
    setCartOpen(false)
    window.scrollTo({ top: 0 })
  }
  const goProducts = () => {
    setPage('home')
    setTimeout(() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  return (
    <AuthProvider>
      <ShopProvider onNeedLogin={login} notify={notify}>
        <Header page={page} setPage={setPage} goProducts={goProducts} onCart={() => setCartOpen(true)} onLogin={login} />
        <main className="main">
          {page === 'home' && <Home />}
          {page === 'wishlist' && <Wishlist onLogin={login} />}
          {page === 'cart' && <Cart onLogin={login} goOrders={() => setPage('orders')} />}
          {page === 'orders' && <Orders onNeedLogin={login} notify={notify} />}
          {page === 'review' && (
            <Review productId={reviewProduct} setProductId={setReviewProduct} onLogin={login} notify={notify} />
          )}
        </main>
        <footer className="footer">© 2026 Jeju Market</footer>
        <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} onGoCart={() => setPage('cart')} onLogin={login} />
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
        {toast && <div className="toast">{toast}</div>}
      </ShopProvider>
    </AuthProvider>
  )
}

export default App
