import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { XCircle } from 'lucide-react'

interface Props {
  title: string
  message: string
  onClose: () => void
}

export default function ErrorModal(props: Props) {
  return (
    <Dialog open onOpenChange={props.onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            {props.title}
          </DialogTitle>
        </DialogHeader>
        <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm text-muted-foreground">
          {props.message}
        </pre>
        <DialogFooter>
          <Button onClick={props.onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
