import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../AuthContext'
import { supabase, dateText } from '../lib/supabase'

function Review({ r, comments, likes, reload, onNeedLogin, notify }) {
  const { user } = useAuth()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(r.content)
  const [rating, setRating] = useState(r.rating)
  const [comment, setComment] = useState('')
  const mine = user?.id === r.user_id
  const liked = likes.some((l) => l.user_id === user?.id)

  async function run(q) {
    const { error } = await q
    if (error) notify(error.message)
    reload()
  }

  async function save() {
    await run(supabase.from('reviews').update({ content: text, rating }).eq('id', r.id))
    setEditing(false)
  }

  async function toggleLike() {
    if (!user) return onNeedLogin()
    await run(
      liked
        ? supabase.from('review_likes').delete().eq('review_id', r.id).eq('user_id', user.id)
        : supabase.from('review_likes').insert({ review_id: r.id }),
    )
  }

  async function addComment(e) {
    e.preventDefault()
    if (!user) return onNeedLogin()
    await run(supabase.from('review_comments').insert({ review_id: r.id, content: comment }))
    setComment('')
  }

  return (
    <li className="review">
      <div className="meta">
        <b>{r.profiles?.name ?? '익명'}</b>
        <span>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
        <small>{dateText(r.created_at)}</small>
      </div>
      {editing ? (
        <>
          <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {'★'.repeat(n)}
              </option>
            ))}
          </select>
          <textarea value={text} onChange={(e) => setText(e.target.value)} />
          <div className="row">
            <button className="primary" onClick={save}>저장</button>
            <button onClick={() => setEditing(false)}>취소</button>
          </div>
        </>
      ) : (
        <p>{r.content}</p>
      )}
      <div className="row">
        <button className={liked ? 'like on' : 'like'} onClick={toggleLike}>
          {liked ? '♥' : '♡'} {likes.length}
        </button>
        {mine && !editing && (
          <>
            <button onClick={() => setEditing(true)}>수정</button>
            <button onClick={() => confirm('후기를 삭제할까요?') && run(supabase.from('reviews').delete().eq('id', r.id))}>
              삭제
            </button>
          </>
        )}
      </div>
      <ul className="comments">
        {comments.map((c) => (
          <li key={c.id}>
            <b>{c.profiles?.name ?? '익명'}</b> {c.content}
            {c.user_id === user?.id && (
              <button className="link" onClick={() => run(supabase.from('review_comments').delete().eq('id', c.id))}>
                삭제
              </button>
            )}
          </li>
        ))}
      </ul>
      <form className="row" onSubmit={addComment}>
        <input placeholder="댓글 달기" value={comment} onChange={(e) => setComment(e.target.value)} required />
        <button>등록</button>
      </form>
    </li>
  )
}

export default function ReviewModal({ product, onClose, onNeedLogin, notify }) {
  const { user } = useAuth()
  const [reviews, setReviews] = useState([])
  const [comments, setComments] = useState([])
  const [likes, setLikes] = useState([])
  const [content, setContent] = useState('')
  const [rating, setRating] = useState(5)

  const load = useCallback(async () => {
    const { data: rs } = await supabase
      .from('reviews')
      .select('*, profiles(name)')
      .eq('product_id', product.id)
      .order('created_at', { ascending: false })
    const ids = (rs ?? []).map((r) => r.id)
    const [c, l] = await Promise.all([
      supabase.from('review_comments').select('*, profiles(name)').in('review_id', ids).order('created_at'),
      supabase.from('review_likes').select('review_id, user_id').in('review_id', ids),
    ])
    setReviews(rs ?? [])
    setComments(c.data ?? [])
    setLikes(l.data ?? [])
  }, [product.id])

  useEffect(() => {
    load()
  }, [load])

  async function submit(e) {
    e.preventDefault()
    if (!user) return onNeedLogin()
    const { error } = await supabase.from('reviews').insert({ product_id: product.id, rating, content })
    if (error) notify(error.message)
    setContent('')
    load()
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row between">
          <h2>
            {product.emoji} {product.name} 후기
          </h2>
          <button onClick={onClose}>닫기</button>
        </div>
        <form className="write" onSubmit={submit}>
          <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {'★'.repeat(n)}
              </option>
            ))}
          </select>
          <textarea placeholder="후기를 남겨주세요" value={content} onChange={(e) => setContent(e.target.value)} required />
          <button className="primary">후기 등록</button>
        </form>
        <ul className="reviews">
          {reviews.length === 0 && <li className="empty">아직 후기가 없습니다.</li>}
          {reviews.map((r) => (
            <Review
              key={r.id}
              r={r}
              comments={comments.filter((c) => c.review_id === r.id)}
              likes={likes.filter((l) => l.review_id === r.id)}
              reload={load}
              onNeedLogin={onNeedLogin}
              notify={notify}
            />
          ))}
        </ul>
      </div>
    </div>
  )
}
