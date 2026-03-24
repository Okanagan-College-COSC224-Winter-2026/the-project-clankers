import { logout } from '../util/login'
import { cn } from '@/lib/utils'
import { LogOut, Home, User } from 'lucide-react'

export default function Sidebar() {
  const location = window.location.pathname

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center justify-center border-b px-4">
        <img src="/oc_logo.png" alt="OC Logo" className="h-10 object-contain" />
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        <SidebarRow
          onClick={() => logout()}
          href="#"
          selected={false}
          icon={<LogOut className="h-4 w-4" />}
        >
          Logout
        </SidebarRow>

        <SidebarRow
          selected={location === '/home'}
          href="/home"
          icon={<Home className="h-4 w-4" />}
        >
          Dashboard
        </SidebarRow>

        <SidebarRow
          selected={location.includes('/profile')}
          href="/profile"
          icon={<User className="h-4 w-4" />}
        >
          My Info
        </SidebarRow>
      </nav>
    </aside>
  )
}

interface SidebarRowProps {
  selected: boolean
  href: string
  children: React.ReactNode
  onClick?: () => void
  icon?: React.ReactNode
}

function SidebarRow(props: SidebarRowProps) {
  return (
    <a
      href={props.selected ? '#' : props.href}
      onClick={props.onClick}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        props.selected
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
      )}
    >
      {props.icon}
      {props.children}
    </a>
  )
}
