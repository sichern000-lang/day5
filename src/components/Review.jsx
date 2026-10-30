import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../AuthContext'
import { useShop } from '../ShopContext'
import { supabase, dateText } from '../lib/supabase'
import { StarsView, StarPicker } from './Stars'

const MAX_MB = 5

async function uploadImage(file, uid) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${uid}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('review-images').upload(path, file, { contentType: file.type })
  if (error) throw error
  return supabase.storage.from('review-images').getPublicUrl(path).data.publicUrl
}

function removeImage(url) {
  const path = url?.split('/review-images/')[1]
  if (path) supabase.storage.from('review-images').remove([decodeURIComponent(path)])
}

function ReviewItem({ r, comments, likes, reload, onLogin, notify }) {
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
    if (!user) return onLogin()
    await run(
      liked
        ? supabase.from('review_likes').delete().eq('review_id', r.id).eq('user_id', user.id)
        : supabase.from('review_likes').insert({ review_id: r.id }),
    )
  }

  async function addComment(e) {
    e.preventDefault()
    if (!user) return onLogin()
    await run(supabase.from('review_comments').insert({ review_id: r.id, content: comment }))
    setComment('')
  }

  return (
    <li className="review">
      <div className="meta">
        <b>{r.profiles?.name ?? '익명'}</b>
        <span className="tag">
          {r.products?.emoji} {r.products?.name}
        </span>
        <small>{dateText(r.created_at)}</small>
      </div>
      {editing ? (
        <>
          <StarPicker value={rating} onChange={setRating} />
          <textarea value={text} onChange={(e) => setText(e.target.value)} />
          <div className="row">
            <button className="pill solid" onClick={save}>
              저장
            </button>
            <button className="pill" onClick={() => setEditing(false)}>
              취소
            </button>
          </div>
        </>
      ) : (
        <>
          <StarsView value={r.rating} />
          <p>{r.content}</p>
          {r.image_url && (
            <a href={r.image_url} target="_blank" rel="noreferrer">
              <img className="review-img" src={r.image_url} alt="후기 사진" loading="lazy" />
            </a>
          )}
        </>
      )}
      <div className="row actions">
        <button className={liked ? 'text-btn on' : 'text-btn'} onClick={toggleLike}>
          {liked ? '♥' : '♡'} {likes.length}
        </button>
        {mine && !editing && (
          <>
            <button className="text-btn" onClick={() => setEditing(true)}>
              수정
            </button>
            <button
              className="text-btn"
              onClick={() => {
                if (!confirm('후기를 삭제할까요?')) return
                removeImage(r.image_url)
                run(supabase.from('reviews').delete().eq('id', r.id))
              }}
            >
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
              <button className="text-btn" onClick={() => run(supabase.from('review_comments').delete().eq('id', c.id))}>
                삭제
              </button>
            )}
          </li>
        ))}
      </ul>
      <form className="comment-form" onSubmit={addComment}>
        <input placeholder="댓글 달기" value={comment} onChange={(e) => setComment(e.target.value)} required />
        <button className="pill">등록</button>
      </form>
    </li>
  )
}

export default function Review({ productId, setProductId, onLogin, notify }) {
  const { user } = useAuth()
  const { products, loadStats } = useShop()
  const [reviews, setReviews] = useState([])
  const [comments, setComments] = useState([])
  const [likes, setLikes] = useState([])
  const [content, setContent] = useState('')
  const [rating, setRating] = useState(5)
  const [target, setTarget] = useState(productId ?? '')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    let q = supabase
      .from('reviews')
      .select('*, profiles!reviews_user_id_fkey(name), products(name, emoji)')
      .order('created_at', { ascending: false })
    if (productId) q = q.eq('product_id', productId)
    const { data: rs } = await q
    const ids = (rs ?? []).map((r) => r.id)
    const [c, l] = await Promise.all([
      supabase.from('review_comments').select('*, profiles!review_comments_user_id_fkey(name)').in('review_id', ids).order('created_at'),
      supabase.from('review_likes').select('review_id, user_id').in('review_id', ids),
    ])
    setReviews(rs ?? [])
    setComments(c.data ?? [])
    setLikes(l.data ?? [])
    loadStats()
  }, [productId, loadStats])

  useEffect(() => {
    load()
  }, [load])

  function pickFile(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!f.type.startsWith('image/')) return notify('이미지 파일만 첨부할 수 있습니다.')
    if (f.size > MAX_MB * 1024 * 1024) return notify(`이미지는 ${MAX_MB}MB 이하만 가능합니다.`)
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  function clearFile() {
    if (preview) URL.revokeObjectURL(preview)
    setFile(null)
    setPreview('')
  }

  async function submit(e) {
    e.preventDefault()
    if (!user) return onLogin()
    const pid = Number(productId ?? target)
    if (!pid) return notify('후기를 남길 상품을 선택해 주세요.')
    setBusy(true)
    try {
      const row = { product_id: pid, rating, content }
      if (file) row.image_url = await uploadImage(file, user.id)
      const { error } = await supabase.from('reviews').insert(row)
      if (error) throw error
      notify('후기가 등록되었습니다.')
      setContent('')
      setRating(5)
      clearFile()
      load()
    } catch (err) {
      notify(err.message)
    }
    setBusy(false)
  }

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0

  return (
    <section className="section">
      <p className="label">(03) Review</p>
      <h2>
        Words from <em>our customers.</em>
      </h2>

      <div className="chips">
        <button className={!productId ? 'chip-btn active' : 'chip-btn'} onClick={() => setProductId(null)}>
          전체
        </button>
        {products.map((p) => (
          <button
            key={p.id}
            className={productId === p.id ? 'chip-btn active' : 'chip-btn'}
            onClick={() => setProductId(p.id)}
          >
            {p.emoji} {p.name}
          </button>
        ))}
      </div>

      <div className="review-summary">
        <b>{reviews.length ? avg.toFixed(1) : '—'}</b>
        <StarsView value={avg} />
        <small>{reviews.length}개의 후기</small>
      </div>

      <form className="panel write" onSubmit={submit}>
        <h3>Write a review</h3>
        {!productId && (
          <select value={target} onChange={(e) => setTarget(e.target.value)} required>
            <option value="">상품 선택</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.emoji} {p.name}
              </option>
            ))}
          </select>
        )}
        <StarPicker value={rating} onChange={setRating} />
        <textarea placeholder="후기를 남겨주세요" value={content} onChange={(e) => setContent(e.target.value)} required />
        <div className="attach">
          <label className="pill">
            📷 사진 첨부
            <input type="file" accept="image/*" hidden onChange={pickFile} />
          </label>
          {preview && (
            <span className="preview">
              <img src={preview} alt="첨부 미리보기" />
              <button type="button" aria-label="첨부 삭제" onClick={clearFile}>
                ×
              </button>
            </span>
          )}
        </div>
        <button className="pill solid" disabled={busy}>
          {busy ? '등록 중…' : '후기 등록'}
        </button>
      </form>

      <ul className="reviews">
        {reviews.length === 0 && <li className="empty">아직 후기가 없습니다. 첫 후기를 남겨보세요.</li>}
        {reviews.map((r) => (
          <ReviewItem
            key={r.id}
            r={r}
            comments={comments.filter((c) => c.review_id === r.id)}
            likes={likes.filter((l) => l.review_id === r.id)}
            reload={load}
            onLogin={onLogin}
            notify={notify}
          />
        ))}
      </ul>
    </section>
  )
}
