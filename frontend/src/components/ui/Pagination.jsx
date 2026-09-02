import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ page, lastPage, onPageChange }) {
  if (lastPage <= 1) return null

  const pages = []
  for (let i = Math.max(1, page - 2); i <= Math.min(lastPage, page + 2); i++) pages.push(i)

  return (
    <div className="pagination">
      <button className="page-btn" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        <ChevronLeft size={14} />
      </button>
      {pages[0] > 1 && <>
        <button className="page-btn" onClick={() => onPageChange(1)}>1</button>
        {pages[0] > 2 && <span style={{padding:'0 4px',color:'var(--color-gray-400)'}}>…</span>}
      </>}
      {pages.map(p => (
        <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => onPageChange(p)}>{p}</button>
      ))}
      {pages[pages.length - 1] < lastPage && <>
        {pages[pages.length - 1] < lastPage - 1 && <span style={{padding:'0 4px',color:'var(--color-gray-400)'}}>…</span>}
        <button className="page-btn" onClick={() => onPageChange(lastPage)}>{lastPage}</button>
      </>}
      <button className="page-btn" disabled={page >= lastPage} onClick={() => onPageChange(page + 1)}>
        <ChevronRight size={14} />
      </button>
    </div>
  )
}
