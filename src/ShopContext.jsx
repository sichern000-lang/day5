import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import { supabase, won } from './lib/supabase'

const ShopContext = createContext(null)

export function ShopProvider({ children, onNeedLogin, notify }) {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [likes, setLikes] = useState([])
  const [cart, setCart] = useState([])
  const [stats, setStats] = useState({ count: 0, avg: 0 })

  const loadProducts = useCallback(async () => {
    const [p, l] = await Promise.all([
      supabase.from('products').select('*').order('id'),
      supabase.from('product_likes').select('product_id, user_id'),
    ])
    setProducts(p.data ?? [])
    setLikes(l.data ?? [])
  }, [])

  const loadStats = useCallback(async () => {
    const { data } = await supabase.from('reviews').select('rating')
    const rows = data ?? []
    setStats({
      count: rows.length,
      avg: rows.length ? rows.reduce((s, r) => s + r.rating, 0) / rows.length : 0,
    })
  }, [])

  const loadCart = useCallback(async () => {
    if (!user) {
      setCart([])
      return
    }
    const { data } = await supabase
      .from('cart_items')
      .select('*, products(name, emoji, unit, stock)')
      .order('created_at')
    setCart(data ?? [])
  }, [user])

  useEffect(() => {
    loadProducts()
    loadStats()
  }, [loadProducts, loadStats])

  useEffect(() => {
    loadCart()
  }, [loadCart])

  const likedIds = useMemo(
    () => new Set(likes.filter((l) => l.user_id === user?.id).map((l) => l.product_id)),
    [likes, user],
  )
  const likeCount = (pid) => likes.filter((l) => l.product_id === pid).length
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)
  const cartTotal = cart.reduce((s, i) => s + i.total_price, 0)

  function requireLogin() {
    if (user) return true
    onNeedLogin()
    return false
  }

  async function toggleLike(pid) {
    if (!requireLogin()) return
    const { error } = likedIds.has(pid)
      ? await supabase.from('product_likes').delete().eq('product_id', pid).eq('user_id', user.id)
      : await supabase.from('product_likes').insert({ product_id: pid })
    if (error) notify(error.message)
    loadProducts()
  }

  async function addToCart(p, qty) {
    if (!requireLogin()) return false
    const { error } = await supabase.rpc('add_to_cart', { p_product_id: p.id, p_qty: qty })
    notify(error ? error.message : `${p.name} ${qty}개를 장바구니에 담았습니다.`)
    loadCart()
    return !error
  }

  async function buyNow(p, qty) {
    if (!requireLogin()) return false
    if (!confirm(`${p.name} ${qty}개를 ${won(p.price * qty)}에 구매할까요?`)) return false
    const { error } = await supabase.rpc('buy_now', { p_product_id: p.id, p_qty: qty })
    notify(error ? error.message : '구매가 완료되었습니다. 주문내역에서 확인하세요.')
    loadProducts()
    return !error
  }

  async function setCartQty(item, qty) {
    if (qty < 1) return
    if (qty > item.products.stock) return notify(`재고가 부족합니다 (재고 ${item.products.stock}개)`)
    const { error } = await supabase.from('cart_items').update({ quantity: qty }).eq('id', item.id)
    if (error) notify(error.message)
    loadCart()
  }

  async function removeFromCart(id) {
    await supabase.from('cart_items').delete().eq('id', id)
    loadCart()
  }

  async function checkout() {
    const { error } = await supabase.rpc('checkout')
    if (error) {
      notify(error.message)
      return false
    }
    notify('주문이 완료되었습니다.')
    loadCart()
    loadProducts()
    return true
  }

  const value = {
    products, likedIds, likeCount, cart, cartCount, cartTotal, stats,
    toggleLike, addToCart, buyNow, setCartQty, removeFromCart, checkout, loadStats,
  }
  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useShop = () => useContext(ShopContext)
