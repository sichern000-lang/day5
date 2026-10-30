import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../AuthContext'
import { supabase, won } from '../lib/supabase'

export default function Cart({ onNeedLogin, notify, goOrders }) {
  const { user } = useAuth()
  const [items, setItems] = useState([])

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('cart_items')
      .select('*, products(name, emoji, unit, stock)')
      .order('created_at')
    setItems(data ?? [])
  }, [])

  useEffect(() => {
    if (user) load()
  }, [user, load])

  if (!user) {
    return (
      <p className="empty">
        로그인 후 이용해 주세요. <button onClick={onNeedLogin}>로그인</button>
      </p>
    )
  }

  async function setQty(item, qty) {
    if (qty < 1) return
    if (qty > item.products.stock) return notify(`재고가 부족합니다 (재고 ${item.products.stock}개)`)
    const { error } = await supabase.from('cart_items').update({ quantity: qty }).eq('id', item.id)
    if (error) notify(error.message)
    load()
  }

  async function remove(id) {
    await supabase.from('cart_items').delete().eq('id', id)
    load()
  }

  async function checkout() {
    const { error } = await supabase.rpc('checkout')
    if (error) return notify(error.message)
    notify('주문이 완료되었습니다.')
    goOrders()
  }

  const total = items.reduce((s, i) => s + i.total_price, 0)

  return (
    <section className="list">
      <h2>장바구니</h2>
      {items.length === 0 && <p className="empty">장바구니가 비어 있습니다.</p>}
      {items.map((i) => (
        <div className="line" key={i.id}>
          <span className="emoji sm">{i.products.emoji}</span>
          <div className="grow">
            <b>{i.products.name}</b>
            <small>
              {i.products.unit} · 단가 {won(i.unit_price)}
            </small>
          </div>
          <div className="row">
            <button onClick={() => setQty(i, i.quantity - 1)}>−</button>
            <span>{i.quantity}</span>
            <button onClick={() => setQty(i, i.quantity + 1)}>+</button>
          </div>
          <b className="amount">{won(i.total_price)}</b>
          <button onClick={() => remove(i.id)}>삭제</button>
        </div>
      ))}
      {items.length > 0 && (
        <div className="total">
          <span>합계 {won(total)}</span>
          <button className="primary" onClick={checkout}>
            주문하기
          </button>
        </div>
      )}
    </section>
  )
}
