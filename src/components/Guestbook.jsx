import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../AuthContext'
import { supabase, dateText } from '../lib/supabase'

export default function Guestbook({ onNeedLogin, notify }) {
  const { user } = useAuth()
  const [list, setList] = useState([])
  const [content, setContent] = useState('')
  const [editId, setEditId] = useState(null)
  const [editText, setEditText] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('guestbook')
      .select('*, profiles(name)')
      .order('created_at', { ascending: false })
    setList(data ?? [])
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function run(q) {
    const { error } = await q
    if (error) notify(error.message)
    load()
  }

  async function submit(e) {
    e.preventDefault()
    if (!user) return onNeedLogin()
    await run(supabase.from('guestbook').insert({ content }))
    setContent('')
  }

  async function save(id) {
    await run(supabase.from('guestbook').update({ content: editText }).eq('id', id))
    setEditId(null)
  }

  return (
    <section className="list">
      <h2>방명록</h2>
      <form className="write" onSubmit={submit}>
        <textarea placeholder="제주 마켓에 한마디 남겨주세요" value={content} onChange={(e) => setContent(e.target.value)} required />
        <button className="primary">남기기</button>
      </form>
      {list.length === 0 && <p className="empty">첫 방명록을 남겨보세요.</p>}
      {list.map((g) => (
        <div className="order" key={g.id}>
          <div className="meta">
            <b>{g.profiles?.name ?? '익명'}</b>
            <small>{dateText(g.created_at)}</small>
          </div>
          {editId === g.id ? (
            <>
              <textarea value={editText} onChange={(e) => setEditText(e.target.value)} />
              <div className="row">
                <button className="primary" onClick={() => save(g.id)}>저장</button>
                <button onClick={() => setEditId(null)}>취소</button>
              </div>
            </>
          ) : (
            <p>{g.content}</p>
          )}
          {g.user_id === user?.id && editId !== g.id && (
            <div className="row">
              <button
                onClick={() => {
                  setEditId(g.id)
                  setEditText(g.content)
                }}
              >
                수정
              </button>
              <button onClick={() => confirm('삭제할까요?') && run(supabase.from('guestbook').delete().eq('id', g.id))}>
                삭제
              </button>
            </div>
          )}
        </div>
      ))}
    </section>
  )
}
