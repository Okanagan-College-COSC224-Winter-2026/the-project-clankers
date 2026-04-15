import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Props {
  onInput?: (value: string) => void
  onChange?: (value: string) => void
  value?: string
  className?: string
  placeholder?: string
  type?: string
  name?: string
  id?: string
  required?: boolean
  disabled?: boolean
}

export default function Textbox(props: Props) {
  return (
    <Input
      type={props.type || 'text'}
      className={cn(props.className)}
      placeholder={props.placeholder}
      value={props.value}
      name={props.name}
      id={props.id}
      required={props.required}
      disabled={props.disabled}
      onChange={(e) => {
        props.onChange?.(e.target.value)
        props.onInput?.(e.target.value)
      }}
    />
  )
}
