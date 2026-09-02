import Modal from './Modal'

export default function ConfirmDialog({ open, onClose, onConfirm, title, message, danger, loading }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title || 'Confirm'}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Processing…' : 'Confirm'}
          </button>
        </>
      }
    >
      <p style={{ color: 'var(--color-gray-600)' }}>{message || 'Are you sure?'}</p>
    </Modal>
  )
}
