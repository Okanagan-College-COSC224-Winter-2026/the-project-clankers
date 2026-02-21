import './AssignmentCard.css'

interface Props {
  onClick?: () => void
  children?: React.ReactNode
  id: number | string
}

export default function Button(props: Props) {
  return (
    <div
      onClick= {() => {
         window.location.href = `/assignments/${props.id}`
      }
    }
      className='A_Card'
    >
      <img src="/icons/document.svg" alt="document" />

      {props.children}
    </div>
  )
}