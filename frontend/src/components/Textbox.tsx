import './Textbox.css'

interface Props {
  onInput?: (value: string) => void
  className?: string
  placeholder?: string
  type?: string
  value?: string
}

export default function Textbox(props: Props) {
  return (
    <input
      type={props.type || 'text'}
      className={'Textbox ' + props.className}
      placeholder={props.placeholder}
      value={props.value}
      onInput={(e) => {
        e.preventDefault()
        if (!props?.onInput) {
          return
        }

        // @ts-expect-error womp womp
        props.onInput(e.target.value)
      }}
    />
  )
}