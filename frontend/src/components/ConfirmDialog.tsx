import './ConfirmDialog.css';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const icons: Record<string, string> = {
    danger: '⚠️',
    warning: '🔀',
    info: 'ℹ️',
    success: '✅',
  };

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-card" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-icon">{icons[variant]}</div>
        <h3 className="confirm-title">{title}</h3>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="confirm-cancel-btn" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className={`confirm-ok-btn confirm-ok-btn--${variant}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}