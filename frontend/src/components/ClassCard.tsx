import { Card, CardContent } from '@/components/ui/card'
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
    <Card
      className="cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1"
      onClick={props.onclick}
    >
      <div className="aspect-video overflow-hidden">
        <img
          src={props.image}
          alt={props.name}
          className="h-full w-full object-cover transition-transform hover:scale-105"
        />
      </div>
      <CardContent className="p-4">
        <h2 className="font-semibold text-lg truncate">{props.name}</h2>
        <p className="text-sm text-muted-foreground truncate">{props.subtitle}</p>
        {props.action && (
          <div className="mt-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {props.action}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
