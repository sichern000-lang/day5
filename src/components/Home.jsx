import { useState } from 'react'
import { useShop } from '../ShopContext'
import ProductCard from './ProductCard'
import { ArrowIcon } from './Icons'

export default function Home() {
  const { products, stats } = useShop()
  const [category, setCategory] = useState('전체')
  const categories = ['전체', ...new Set(products.map((p) => p.category))]
  const shown = category === '전체' ? products : products.filter((p) => p.category === category)

  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <p className="label">Jeju Market</p>
          <h1>
            Brightening Your Table, <em>One Box</em> at a Time.
          </h1>
          <p className="lead">
            제주 바다와 햇살이 키운 감귤, 흑돼지, 갈치까지.<br />
            산지의 신선함을 문 앞까지 보내드려요.
          </p>
          <a className="pill solid big" href="#products">
            Shop now <ArrowIcon />
          </a>
        </div>
        <div className="hero-visual">
          <img src="/hero.png" alt="제주 감귤이 담긴 바구니와 촛불" />
          <div className="rating-card">
            <span className="chip">AVG Ratings</span>
            <b>{stats.count ? stats.avg.toFixed(1) : '-'}</b>
            <small>
              {stats.count ? `${stats.count}개의 고객 리뷰 평균` : '첫 리뷰를 기다리고 있어요'}
            </small>
          </div>
        </div>
      </section>

      <section className="section" id="products">
        <p className="label">(01) Products</p>
        <h2>
          Taste of <em>Jeju,</em> picked for you.
        </h2>
        <div className="chips">
          {categories.map((c) => (
            <button key={c} className={c === category ? 'chip-btn active' : 'chip-btn'} onClick={() => setCategory(c)}>
              {c}
            </button>
          ))}
        </div>
        <div className="grid">
          {shown.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </section>
    </>
  )
}
