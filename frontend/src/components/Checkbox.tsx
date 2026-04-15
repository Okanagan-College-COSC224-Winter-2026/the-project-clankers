import { Checkbox as ShadcnCheckbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface Props {
  id?: string
  name?: string
  checked: boolean
  onChange: () => void
  label?: string
  className?: string
}

export default function Checkbox(props: Props) {
  const checkboxId = props.id || props.name || `checkbox-${Math.random().toString(36).slice(2)}`

  return (
    <div className={cn('flex items-center gap-2', props.className)}>
      <ShadcnCheckbox
        id={checkboxId}
        name={props.name}
        checked={props.checked}
        onCheckedChange={props.onChange}
      />
      {props.label && (
        <Label htmlFor={checkboxId} className="cursor-pointer">
          {props.label}
        </Label>
      )}
    </div>
  )
}
