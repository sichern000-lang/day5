import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../AuthContext'
import { supabase, won, dateText } from '../lib/supabase'

export default function Orders({ onNeedLogin, notify }) {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*, products(name, emoji))')
      .order('created_at', { ascending: false })
    setOrders(data ?? [])
  }, [])

  useEffect(() => {
    if (user) load()
  }, [user, load])

  if (!user) {
    return (
      <p className="empty">
        로그인 후 이용해 주세요. <button className="pill solid" onClick={onNeedLogin}>Log in</button>
      </p>
    )
  }

  async function giveBack(id) {
    if (!confirm('이 주문을 반환할까요?')) return
    const { error } = await supabase.rpc('return_order', { p_order_id: id })
    notify(error ? error.message : '반환 처리되었습니다.')
    load()
  }

  return (
    <section className="section">
      <p className="label">Orders</p>
      <h2>
        Your <em>orders.</em>
      </h2>
      {orders.length === 0 && <p className="empty">주문 내역이 없습니다.</p>}
      {orders.map((o) => (
        <div className="order panel" key={o.id}>
          <div className="row between">
            <small>{dateText(o.created_at)}</small>
            <span className={o.status === 'returned' ? 'badge off' : 'badge'}>
              {o.status === 'returned' ? '반환됨' : '결제완료'}
            </span>
          </div>
          {o.order_items.map((i) => (
            <div className="line" key={i.id}>
              <span className="thumb">{i.products.emoji}</span>
              <div className="grow">
                <b>{i.products.name}</b>
                <small>
                  {won(i.unit_price)} × {i.quantity}
                </small>
              </div>
              <b className="amount">{won(i.total_price)}</b>
            </div>
          ))}
          <div className="total">
            <span>총 {won(o.total_price)}</span>
            {o.status === 'paid' && <button className="pill" onClick={() => giveBack(o.id)}>반환</button>}
          </div>
        </div>
      ))}
    </section>
  )
}
