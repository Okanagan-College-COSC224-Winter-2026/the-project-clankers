import './Button.css'

interface Props {
  onClick?: () => void
  children?: React.ReactNode
  type?: 'regular' | 'secondary'
  disabled?: boolean
}

export default function Button(props: Props) {
  return (
    <button
      className={'Button ' + (props.disabled ? 'disabled ' : ' ') + (props.type || 'regular')}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  )
}