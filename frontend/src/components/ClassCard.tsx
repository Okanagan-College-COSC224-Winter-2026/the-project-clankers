import './ClassCard.css'
import { ReactNode } from 'react'

interface Props {
  image: string
  name: string
  subtitle: string
  onclick?: () => void
  action?: ReactNode
}

export default function ClassCard(props: Props) {
  return (
    <div className="ClassCard" onClick={props.onclick}>
      <img src={props.image} alt={props.name} />
      <div className="ClassInfo">
        <h2>{props.name}</h2>
        <p>{props.subtitle}</p>
        {props.action && (
          <div className="ClassAction" onClick={(e) => e.stopPropagation()}>
            {props.action}
          </div>
        )}
      </div>
    </div>
  )
}