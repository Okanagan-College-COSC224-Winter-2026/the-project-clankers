import './StatusMessage.css';

interface Props {
  message?: string | null;
  type?: 'error' | 'success';
  className?: string;
  children?: React.ReactNode;
}

export default function StatusMessage(props: Props) {
  const type = props.type || 'error';
  
  // Don't render if no message and no children
  if (!props.message && !props.children) {
    return null;
  }

  return (
    <div
      className={`Status-Message Status-Message--${type} ${props.className ?? ''}`}
      role="alert"
      aria-live="polite"
    >
      {props.children ? props.children : <span className="Status-Text">{props.message}</span>}
    </div>
  );
}
