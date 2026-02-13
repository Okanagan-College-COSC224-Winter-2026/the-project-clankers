import Button from './Button';
import './ErrorModal.css';

interface Props {
  title: string;
  message: string;
  onClose: () => void;
}

export default function ErrorModal(props: Props) {
  return (
    <div className="ErrorModal-Overlay">
      <div className="ErrorModal">
        <div className="ErrorModal-Header">
          <h2>❌ {props.title}</h2>
          <button className="ErrorModal-Close" onClick={props.onClose}>×</button>
        </div>

        <div className="ErrorModal-Content">
          <pre className="ErrorModal-Message">{props.message}</pre>
        </div>

        <div className="ErrorModal-Footer">
          <Button onClick={props.onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
