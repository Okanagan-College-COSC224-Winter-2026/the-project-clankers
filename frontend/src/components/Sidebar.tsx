import { logout, isAdmin } from '../util/login'
import './Sidebar.css'

export default function Sidebar() {
  // Check which page we are on
  const location = window.location.pathname

  return (
    <div className="Sidebar">
      <div className="SidebarLogo">
        <img src="/oc_logo.png" alt="OC Logo" />
      </div>

      <div className="SidebarTop">
        <SidebarRow
          onClick={() => logout()}
          href='#'
          selected={false}
        >
          Logout
        </SidebarRow>

        <SidebarRow selected={location === '/home'} href="/home">
          Dashboard
        </SidebarRow>

        <SidebarRow selected={location.includes('/profile')} href="/profile">
          My Info
        </SidebarRow>

        {isAdmin() && (
          <>
            <div className="Sidebar-Divider" />
            <div className="Sidebar-Section">Admin</div>
            <SidebarRow selected={location.includes('/admin/users')} href="/admin/users">
              Manage Users
            </SidebarRow>
            <SidebarRow selected={location.includes('/admin/create-teacher')} href="/admin/create-teacher">
              Create Teacher
            </SidebarRow>
          </>
        )}
      </div>
    </div>
  )
}

interface SidebarRowProps {
  selected: boolean
  href: string
  children: React.ReactNode
  onClick?: () => void
}

function SidebarRow(props: SidebarRowProps) {
  return (
    <div className={`SidebarRow ${props.selected ? 'selected' : ''}`} onClick={props.onClick}>
      <a href={props.selected ? '#' : props.href}>{props.children}</a>
    </div>
  )
}