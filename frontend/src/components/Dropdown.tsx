interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  value: string;
  onInput: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function Dropdown({
  value,
  onInput,
  options,
  placeholder,
  disabled,
  className,
}: DropdownProps) {
  return (
    <select
      value={value}
      onChange={(e) => onInput(e.target.value)}
      disabled={disabled}
      className={`w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
        disabled:bg-gray-100 disabled:cursor-not-allowed ${className || ''}`}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
