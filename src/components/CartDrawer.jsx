import { useAuth } from '../AuthContext'
import { useShop } from '../ShopContext'
import { won } from '../lib/supabase'
import { CloseIcon } from './Icons'

export default function CartDrawer({ open, onClose, onGoCart, onLogin }) {
  const { user } = useAuth()
  const { cart, cartTotal, setCartQty, removeFromCart } = useShop()

  return (
    <>
      <div className={open ? 'scrim show' : 'scrim'} onClick={onClose} />
      <aside className={open ? 'drawer open' : 'drawer'} aria-hidden={!open}>
        <div className="drawer-head">
          <h2>Cart</h2>
          <button className="icon-btn" aria-label="Close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div className="drawer-body">
          {!user && (
            <p className="empty">
              로그인 후 이용해 주세요.
              <br />
              <button className="pill solid" onClick={onLogin}>
                Log in
              </button>
            </p>
          )}
          {user && cart.length === 0 && <p className="empty">장바구니가 비어 있습니다.</p>}
          {user &&
            cart.map((i) => (
              <div className="line" key={i.id}>
                <span className="thumb">{i.products.emoji}</span>
                <div className="grow">
                  <b>{i.products.name}</b>
                  <small>
                    {i.products.unit} · {won(i.unit_price)}
                  </small>
                  <div className="stepper">
                    <button onClick={() => setCartQty(i, i.quantity - 1)}>−</button>
                    <span>{i.quantity}</span>
                    <button onClick={() => setCartQty(i, i.quantity + 1)}>+</button>
                  </div>
                </div>
                <div className="right">
                  <b>{won(i.total_price)}</b>
                  <button className="text-btn" onClick={() => removeFromCart(i.id)}>
                    삭제
                  </button>
                </div>
              </div>
            ))}
        </div>

        {user && cart.length > 0 && (
          <div className="drawer-foot">
            <div className="subtotal">
              <span>합계</span>
              <b>{won(cartTotal)}</b>
            </div>
            <button className="pill solid wide" onClick={onGoCart}>
              장바구니로 가기
            </button>
          </div>
        )}
      </aside>
    </>
  )
}
