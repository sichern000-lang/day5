import { useState } from 'react'
import { useAuth } from '../AuthContext'
import { useShop } from '../ShopContext'
import { supabase } from '../lib/supabase'
import { CartIcon, HeartIcon, MenuIcon, CloseIcon } from './Icons'

export default function Header({ page, goProducts, setPage, onCart, onLogin }) {
  const { user, name } = useAuth()
  const { cartCount, likedIds } = useShop()
  const saved = user ? likedIds.size : 0
  const [menuOpen, setMenuOpen] = useState(false)
  const go = (fn) => () => {
    setMenuOpen(false)
    fn()
  }

  return (
    <header className="header">
      <div className="h-left">
        <button className="icon-btn" aria-label="Cart" onClick={onCart}>
          <CartIcon />
          {cartCount > 0 && <span className="count">{cartCount}</span>}
        </button>
        <button
          className={page === 'wishlist' ? 'icon-btn active' : 'icon-btn'}
          aria-label="Saved products"
          onClick={() => setPage('wishlist')}
        >
          <HeartIcon filled={saved > 0} />
          {saved > 0 && <span className="count">{saved}</span>}
        </button>
      </div>

      <button className="brand" onClick={() => setPage('home')}>
        Jeju <em>Market</em>
      </button>

      <button
        className="icon-btn hamburger"
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        {menuOpen ? <CloseIcon /> : <MenuIcon />}
      </button>

      <div className="h-right">
        <nav>
          <button className={page === 'home' ? 'nav active' : 'nav'} onClick={goProducts}>
            Products
          </button>
          <button className={page === 'review' ? 'nav active' : 'nav'} onClick={() => setPage('review')}>
            Review
          </button>
          <button className={page === 'orders' ? 'nav active' : 'nav'} onClick={() => setPage('orders')}>
            Orders
          </button>
        </nav>
        {user ? (
          <div className="user">
            <span>{name}</span>
            <button className="pill" onClick={() => supabase.auth.signOut()}>
              Log out
            </button>
          </div>
        ) : (
          <button className="pill solid" onClick={onLogin}>
            Log in
          </button>
        )}
      </div>
      {menuOpen && (
        <nav className="mobile-menu">
          <button className={page === 'home' ? 'active' : ''} onClick={go(goProducts)}>
            Products
          </button>
          <button className={page === 'review' ? 'active' : ''} onClick={go(() => setPage('review'))}>
            Review
          </button>
          <button className={page === 'orders' ? 'active' : ''} onClick={go(() => setPage('orders'))}>
            Orders
          </button>
          {user ? (
            <>
              <span className="who">{name}</span>
              <button onClick={go(() => supabase.auth.signOut())}>Log out</button>
            </>
          ) : (
            <button className="login" onClick={go(onLogin)}>
              Log in
            </button>
          )}
        </nav>
      )}
    </header>
  )
}
