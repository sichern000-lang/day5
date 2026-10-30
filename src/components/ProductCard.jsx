import { useState } from 'react'
import { useShop } from '../ShopContext'
import { won } from '../lib/supabase'
import { HeartIcon } from './Icons'

export default function ProductCard({ p }) {
  const { likedIds, likeCount, toggleLike, addToCart, buyNow } = useShop()
  const [qty, setQty] = useState(1)
  const liked = likedIds.has(p.id)

  return (
    <article className="card">
      <div className="visual">
        <span className="tag">{p.category}</span>
        <button
          className={liked ? 'heart on' : 'heart'}
          aria-label={liked ? 'Remove from saved' : 'Save'}
          onClick={() => toggleLike(p.id)}
        >
          <HeartIcon filled={liked} />
          <small>{likeCount(p.id)}</small>
        </button>
        <span className="emoji">{p.emoji}</span>
      </div>
      <h3>{p.name}</h3>
      <p className="desc">{p.description}</p>
      <p className="meta-line">
        {p.unit} · {p.stock > 0 ? `재고 ${p.stock}개` : '품절'}
      </p>
      <div className="price-row">
        <b className="price">{won(p.price)}</b>
        <div className="stepper">
          <button onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
          <span>{qty}</span>
          <button onClick={() => setQty(Math.min(Math.max(p.stock, 1), qty + 1))}>+</button>
        </div>
      </div>
      <p className="sum">합계 {won(p.price * qty)}</p>
      <div className="row">
        <button className="pill" disabled={p.stock < 1} onClick={() => addToCart(p, qty)}>
          Add to cart
        </button>
        <button className="pill solid" disabled={p.stock < 1} onClick={() => buyNow(p, qty)}>
          Buy now
        </button>
      </div>
    </article>
  )
}
