import './Dropdown.css';

interface DropdownOption {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onInput: (value: string) => void;
  options: DropdownOption[];
  className?: string;
  placeholder?: string;
}

export default function Dropdown(props: Props) {
  return (
    <select
      className={'Dropdown ' + (props.className || '')}
      value={props.value}
      onChange={(e) => {
        props.onInput(e.target.value);
      }}
    >
      {props.placeholder && (
        <option value="" disabled>
          {props.placeholder}
        </option>
      )}
      {props.options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
