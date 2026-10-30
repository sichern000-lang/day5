import { useAuth } from '../AuthContext'
import { useShop } from '../ShopContext'
import ProductCard from './ProductCard'

export default function Wishlist({ onLogin }) {
  const { user } = useAuth()
  const { products, likedIds } = useShop()
  const saved = products.filter((p) => likedIds.has(p.id))

  return (
    <section className="section">
      <p className="label">Saved</p>
      <h2>
        Your <em>favorites.</em>
      </h2>
      {!user ? (
        <p className="empty">
          로그인하면 하트를 누른 상품이 여기에 저장됩니다.
          <br />
          <button className="pill solid" onClick={onLogin}>
            Log in
          </button>
        </p>
      ) : saved.length === 0 ? (
        <p className="empty">아직 담아둔 상품이 없습니다. 상품의 하트를 눌러 보세요.</p>
      ) : (
        <div className="grid">
          {saved.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </section>
  )
}
