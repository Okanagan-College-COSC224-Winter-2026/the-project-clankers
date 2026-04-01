import { useEffect, useState } from 'react'
import { logout, isStudent, isTeacher } from '../util/login'
import { cn } from '@/lib/utils'
import { LogOut, Home, User, Search, Bell } from 'lucide-react'
import { getEnrollmentRequests } from '../util/api'
import NotificationCenter from './NotificationCenter'

export default function Sidebar() {
  const location = window.location.pathname
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  const fetchPendingRequests = async () => {
    if (!isTeacher()) return
    try {
      const requests = await getEnrollmentRequests()
      const count = Array.isArray(requests)
        ? requests.filter((r: any) => r.status === 'pending').length
        : 0
      setPendingCount(count)
    } catch (err) {
      console.error('Error fetching enrollment requests:', err)
    }
  }

  useEffect(() => {
    if (isTeacher()) {
      fetchPendingRequests()
      // Poll for new requests every 30 seconds
      const interval = setInterval(fetchPendingRequests, 30000)
      return () => clearInterval(interval)
    }
  }, [])

  const handleNotificationClose = () => {
    setNotificationOpen(false)
    fetchPendingRequests()
  }

  return (
    <>
      <aside className="flex h-screen w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
        <div className="flex h-16 items-center justify-between px-4 border-b">
          <img src="/oc_logo.png" alt="OC Logo" className="h-10 object-contain" />
          {isTeacher() && (
            <button
              onClick={() => setNotificationOpen(true)}
              className="relative p-2 hover:bg-sidebar-accent rounded-lg transition-colors"
              title="View enrollment requests"
            >
              <Bell className="h-5 w-5" />
              {pendingCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
          )}
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

          {isStudent() && (
            <SidebarRow
              selected={location === '/browse'}
              href="/browse"
              icon={<Search className="h-4 w-4" />}
            >
              Browse Courses
            </SidebarRow>
          )}

          <SidebarRow
            selected={location.includes('/profile')}
            href="/profile"
            icon={<User className="h-4 w-4" />}
          >
            My Info
          </SidebarRow>
        </nav>
      </aside>

      <NotificationCenter
        isOpen={notificationOpen}
        onClose={handleNotificationClose}
        onRequestUpdated={fetchPendingRequests}
      />
    </>
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
