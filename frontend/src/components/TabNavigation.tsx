import { cn } from '@/lib/utils'

interface Props {
  tabs: {
    label: string
    path: string
  }[]
}

export default function TabNavigation(props: Props) {
  const currentPath = window.location.pathname

  return (
    <div className="flex border-b">
      {props.tabs.map((tab) => (
        <button
          key={tab.path}
          onClick={() => (window.location.href = tab.path)}
          className={cn(
            'relative px-4 py-2 text-sm font-medium transition-colors',
            tab.path === currentPath
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {tab.label}
          {tab.path === currentPath && (
            <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />
          )}
        </button>
      ))}
    </div>
  )
}
