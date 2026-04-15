import { Button as ShadcnButton } from '@/components/ui/button'

interface Props {
  onClick?: () => void
  children?: React.ReactNode
  type?: 'regular' | 'secondary' | 'submit' | 'button'
  disabled?: boolean
  className?: string
}

export default function Button(props: Props) {
  const htmlType = (props.type === 'submit') ? 'submit' : 'button'
  const variant = (props.type === 'secondary') ? 'secondary' : 'default'

  return (
    <ShadcnButton
      type={htmlType}
      variant={variant}
      onClick={props.onClick}
      disabled={props.disabled}
      className={props.className}
    >
      {props.children}
    </ShadcnButton>
  )
}
