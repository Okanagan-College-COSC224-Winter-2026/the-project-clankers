import './Button.css'

interface Props {
  onClick?: () => void
  children?: React.ReactNode
  type?: 'regular' | 'secondary' | 'submit' | 'button'
  disabled?: boolean
}

export default function Button(props: Props) {
  // Determine button HTML type (submit or button)
  const htmlType = (props.type === 'submit') ? 'submit' : 'button';
  
  // Determine CSS class (regular or secondary)
  const cssType = (props.type === 'secondary') ? 'secondary' : 'regular';
  
  return (
    <button
      type={htmlType}
      className={'Button ' + (props.disabled ? 'disabled ' : ' ') + cssType}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  )
}