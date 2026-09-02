import { fileIconClass } from '../../utils/helpers'

export default function FileIcon({ type, size = 40 }) {
  return (
    <div className={`file-icon ${fileIconClass(type)}`} style={{ width: size, height: size, fontSize: size * 0.25 }}>
      {(type || 'FILE').toUpperCase().slice(0, 4)}
    </div>
  )
}
