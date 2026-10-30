import { useState } from 'react'
import './App.css'
import { AuthProvider } from './AuthContext'
import Header from './components/Header'
import Shop from './components/Shop'
import Cart from './components/Cart'
import Orders from './components/Orders'
import Guestbook from './components/Guestbook'
import AuthModal from './components/AuthModal'

function App() {
  const [page, setPage] = useState('shop')
  const [showAuth, setShowAuth] = useState(false)
  const [toast, setToast] = useState('')

  const notify = (m) => {
    setToast(m)
    setTimeout(() => setToast(''), 2500)
  }
  const needLogin = () => setShowAuth(true)

  return (
    <AuthProvider>
      <Header page={page} setPage={setPage} onLogin={needLogin} />
      <main className="main">
        {page === 'shop' && <Shop onNeedLogin={needLogin} notify={notify} />}
        {page === 'cart' && <Cart onNeedLogin={needLogin} notify={notify} goOrders={() => setPage('orders')} />}
        {page === 'orders' && <Orders onNeedLogin={needLogin} notify={notify} />}
        {page === 'guestbook' && <Guestbook onNeedLogin={needLogin} notify={notify} />}
      </main>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      {toast && <div className="toast">{toast}</div>}
    </AuthProvider>
  )
}

export default App
