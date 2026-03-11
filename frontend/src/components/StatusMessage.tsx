import { useEffect, useState, useRef } from 'react';
import './StatusMessage.css';

interface Props {
  message?: string | null;
  type?: 'error' | 'success';
  className?: string;
  children?: React.ReactNode;
}

export default function StatusMessage(props: Props) {
  const type = props.type || 'error';
  const [visible, setVisible] = useState(false);
  const prevMessageRef = useRef<string | null | undefined>(null);
  const counterRef = useRef(0);

  useEffect(() => {
    if (props.message || props.children) {
      // Always re-trigger, even for the same message
      counterRef.current += 1;
      prevMessageRef.current = props.message;
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [props.message, props.children]);

  if (!props.message && !props.children) return null;

  return (
    <div
      className={`Status-Message Status-Message--${type} ${visible ? 'Status-Message--visible' : 'Status-Message--hidden'} ${props.className ?? ''}`}
      role="alert"
      aria-live="polite"
    >
      {props.children ? props.children : <span className="Status-Text">{props.message}</span>}
    </div>
  );
}
