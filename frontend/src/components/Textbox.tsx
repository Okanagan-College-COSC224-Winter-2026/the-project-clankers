import './Textbox.css'

interface Props {
  onInput?: (value: string) => void
  className?: string
  placeholder?: string
  type?: string
  value?: string
  style?: React.CSSProperties
}

export default function Textbox(props: Props) {
  return (
    <input 
      type={props.type || 'text'} 
      className={'Textbox ' + props.className} 
      placeholder={props.placeholder}
      value={props.value}
      style={props.style}
      onChange={(e) => {
        if (!props?.onInput) {
          return
        }
        props.onInput(e.target.value)
      }} 
    />
  )
}