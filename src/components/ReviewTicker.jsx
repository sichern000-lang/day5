import { useEffect, useState } from 'react'
import { useShop } from '../ShopContext'
import { supabase } from '../lib/supabase'
import { StarsView } from './Stars'

const INTERVAL = 4000

export default function ReviewTicker() {
  const { stats } = useShop()
  const [reviews, setReviews] = useState([])
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    supabase
      .from('reviews')
      .select('id, rating, content, profiles!reviews_user_id_fkey(name), products(name, emoji)')
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => setReviews(data ?? []))
  }, [stats.count])

  useEffect(() => {
    if (paused || reviews.length < 2) return
    const t = setInterval(() => setI((n) => n + 1), INTERVAL)
    return () => clearInterval(t)
  }, [paused, reviews.length])

  if (reviews.length === 0) {
    return (
      <div className="rating-card">
        <span className="chip">Reviews</span>
        <small>첫 리뷰를 기다리고 있어요</small>
      </div>
    )
  }

  const r = reviews[i % reviews.length]
  return (
    <div
      className="rating-card"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <span className="chip">
        {r.products?.emoji} {r.products?.name}
      </span>
      <div className="ticker-item" key={r.id}>
        <StarsView value={r.rating} />
        <p>{r.content}</p>
        <small>— {r.profiles?.name ?? '익명'}</small>
      </div>
      {reviews.length > 1 && (
        <div className="dots" aria-hidden="true">
          {reviews.map((x, n) => (
            <span key={x.id} className={n === i % reviews.length ? 'on' : ''} />
          ))}
        </div>
      )}
    </div>
  )
}
