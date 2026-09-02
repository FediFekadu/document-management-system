import { format, formatDistanceToNow } from 'date-fns'

export function formatDate(date) {
  if (!date) return '—'
  try { return format(new Date(date), 'MMM d, yyyy') }
  catch { return '—' }
}

export function formatDateTime(date) {
  if (!date) return '—'
  try { return format(new Date(date), 'MMM d, yyyy HH:mm') }
  catch { return '—' }
}

export function timeAgo(date) {
  if (!date) return '—'
  try { return formatDistanceToNow(new Date(date), { addSuffix: true }) }
  catch { return '—' }
}

export function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function fileIconClass(type) {
  const t = (type || '').toLowerCase()
  if (t === 'pdf') return 'file-pdf'
  if (['doc','docx'].includes(t)) return 'file-doc'
  if (['xls','xlsx'].includes(t)) return 'file-xls'
  if (['ppt','pptx'].includes(t)) return 'file-ppt'
  if (['jpg','jpeg','png','gif','webp'].includes(t)) return 'file-img'
  if (['zip','rar'].includes(t)) return 'file-zip'
  if (t === 'txt') return 'file-txt'
  return 'file-other'
}

export function getStatusBadge(status) {
  const map = {
    active:    'badge-green',
    completed: 'badge-blue',
    archived:  'badge-gray',
    deleted:   'badge-red',
  }
  return map[status] || 'badge-gray'
}

export function getErrorMessage(err) {
  return err?.response?.data?.message || err?.message || 'Something went wrong.'
}

export function debounce(fn, delay) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export function buildQueryString(params) {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '' && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
}
