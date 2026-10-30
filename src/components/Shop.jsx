import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../AuthContext'
import { supabase, won } from '../lib/supabase'
import ReviewModal from './ReviewModal'

function ProductCard({ p, likes, mine, onLike, onNeedLogin, onReviews, onChanged, notify }) {
  const { user } = useAuth()
  const [qty, setQty] = useState(1)

  async function addCart() {
    if (!user) return onNeedLogin()
    const { error } = await supabase.rpc('add_to_cart', { p_product_id: p.id, p_qty: qty })
    notify(error ? error.message : `장바구니에 ${p.name} ${qty}개를 담았습니다.`)
  }

  async function buyNow() {
    if (!user) return onNeedLogin()
    if (!confirm(`${p.name} ${qty}개를 ${won(p.price * qty)}에 구매할까요?`)) return
    const { error } = await supabase.rpc('buy_now', { p_product_id: p.id, p_qty: qty })
    notify(error ? error.message : '구매가 완료되었습니다. 주문내역에서 확인하세요.')
    onChanged()
  }

  return (
    <article className="card">
      <div className="emoji">{p.emoji}</div>
      <span className="tag">{p.category}</span>
      <h2>{p.name}</h2>
      <p className="desc">{p.description}</p>
      <p className="unit">{p.unit}</p>
      <p className="price">{won(p.price)}</p>
      <p className="stock">{p.stock > 0 ? `재고 ${p.stock}개` : '품절'}</p>
      <div className="row">
        <button className={mine ? 'like on' : 'like'} onClick={onLike}>
          {mine ? '♥' : '♡'} {likes}
        </button>
        <button onClick={onReviews}>후기</button>
      </div>
      <div className="row">
        <input
          type="number"
          min="1"
          max={Math.max(p.stock, 1)}
          value={qty}
          onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
        />
        <span className="sum">= {won(p.price * qty)}</span>
      </div>
      <div className="row">
        <button disabled={p.stock < 1} onClick={addCart}>
          장바구니
        </button>
        <button className="primary" disabled={p.stock < 1} onClick={buyNow}>
          바로구매
        </button>
      </div>
    </article>
  )
}

export default function Shop({ onNeedLogin, notify }) {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [likes, setLikes] = useState([])
  const [reviewFor, setReviewFor] = useState(null)

  const load = useCallback(async () => {
    const [p, l] = await Promise.all([
      supabase.from('products').select('*').order('id'),
      supabase.from('product_likes').select('product_id, user_id'),
    ])
    setProducts(p.data ?? [])
    setLikes(l.data ?? [])
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function toggleLike(productId) {
    if (!user) return onNeedLogin()
    const liked = likes.some((l) => l.product_id === productId && l.user_id === user.id)
    const q = liked
      ? supabase.from('product_likes').delete().eq('product_id', productId).eq('user_id', user.id)
      : supabase.from('product_likes').insert({ product_id: productId })
    const { error } = await q
    if (error) notify(error.message)
    load()
  }

  return (
    <>
      <section className="grid">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            p={p}
            likes={likes.filter((l) => l.product_id === p.id).length}
            mine={likes.some((l) => l.product_id === p.id && l.user_id === user?.id)}
            onLike={() => toggleLike(p.id)}
            onNeedLogin={onNeedLogin}
            onReviews={() => setReviewFor(p)}
            onChanged={load}
            notify={notify}
          />
        ))}
      </section>
      {reviewFor && (
        <ReviewModal product={reviewFor} onClose={() => setReviewFor(null)} onNeedLogin={onNeedLogin} notify={notify} />
      )}
    </>
  )
}
