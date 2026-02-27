import './AssignmentCard.css'

interface Props {
  onClick?: () => void
  children?: React.ReactNode
  id: number | string
  dueDate?: string | null
}

export default function Button(props: Props) {
  const isOverdue = props.dueDate ? new Date(props.dueDate) < new Date() : false;
  
  return (
    <div
      onClick= {() => {
         window.location.href = `/assignments/${props.id}`
      }
    }
      className='A_Card'
    >
      <img src="/icons/document.svg" alt="document" />
      
      <span className="assignment-name">{props.children}</span>
      
      {props.dueDate && (
        <span className={`due-date-badge ${isOverdue ? 'overdue' : ''}`}>
          {isOverdue ? 'Overdue' : `Due: ${new Date(props.dueDate).toLocaleDateString()}`}
        </span>
      )}
    </div>
  )
}