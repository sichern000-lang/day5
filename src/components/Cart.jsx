import { useAuth } from '../AuthContext'
import { useShop } from '../ShopContext'
import { won } from '../lib/supabase'

export default function Cart({ onLogin, goOrders }) {
  const { user } = useAuth()
  const { cart, cartTotal, setCartQty, removeFromCart, checkout } = useShop()

  async function order() {
    if (await checkout()) goOrders()
  }

  return (
    <section className="section">
      <p className="label">Cart</p>
      <h2>
        Your <em>basket.</em>
      </h2>
      {!user ? (
        <p className="empty">
          로그인 후 이용해 주세요.
          <br />
          <button className="pill solid" onClick={onLogin}>
            Log in
          </button>
        </p>
      ) : cart.length === 0 ? (
        <p className="empty">장바구니가 비어 있습니다.</p>
      ) : (
        <div className="panel">
          {cart.map((i) => (
            <div className="line" key={i.id}>
              <span className="thumb">{i.products.emoji}</span>
              <div className="grow">
                <b>{i.products.name}</b>
                <small>
                  {i.products.unit} · 단가 {won(i.unit_price)}
                </small>
              </div>
              <div className="stepper">
                <button onClick={() => setCartQty(i, i.quantity - 1)}>−</button>
                <span>{i.quantity}</span>
                <button onClick={() => setCartQty(i, i.quantity + 1)}>+</button>
              </div>
              <b className="amount">{won(i.total_price)}</b>
              <button className="text-btn" onClick={() => removeFromCart(i.id)}>
                삭제
              </button>
            </div>
          ))}
          <div className="total">
            <span>합계 {won(cartTotal)}</span>
            <button className="pill solid" onClick={order}>
              주문하기
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
