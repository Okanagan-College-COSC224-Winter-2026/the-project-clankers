import './ErrorMessage.css';

interface Props {
  message?: string | null;
  className?: string;
}

export default function ErrorMessage(props : Props) {
  return (
    <div className={`Error-Message ${props.className ?? ''}`}>
      <span className="Error-Text">{props.message}</span>
    </div>
  );
}