import './Checkbox.css';

interface Props {
  id?: string;
  name?: string;
  checked: boolean;
  onChange: () => void;
  label?: string;
  className?: string;
}

export default function Checkbox(props: Props) {
  return (
    <label className={'Checkbox ' + (props.className || '')}>
      <input id={props.id} name={props.name} type="checkbox" checked={props.checked} onChange={props.onChange} />
      <span className="CheckboxLabel">{props.label}</span>
    </label>
  );
}