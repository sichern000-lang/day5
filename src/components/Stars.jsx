export function StarsView({ value }) {
  return (
    <span className="stars" aria-label={`${value} / 5`}>
      {'★'.repeat(Math.round(value))}
      <span className="off">{'★'.repeat(5 - Math.round(value))}</span>
    </span>
  )
}

export function StarPicker({ value, onChange }) {
  return (
    <span className="star-picker" role="radiogroup" aria-label="별점">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          type="button"
          key={n}
          role="radio"
          aria-checked={value === n}
          className={n <= value ? 'on' : ''}
          onClick={() => onChange(n)}
        >
          ★
        </button>
      ))}
    </span>
  )
}
