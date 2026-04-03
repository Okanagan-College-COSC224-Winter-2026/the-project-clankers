import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Card } from '@/components/ui/card'
import { Search, LayoutList, Trash2 } from 'lucide-react'
import { getProfilePictureUrl } from '../util/api'
import { isTeacher } from '../util/login'

export interface MemberItem {
  id: number
  name: string
  email: string
  role: string
  student_id?: string
  profile_picture_url?: string
}

interface Props {
  members: MemberItem[]
  userGroups: Map<number, string>
  onRemove?: (member: MemberItem) => void
}

const roleColors: Record<string, string> = {
  teacher: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  student: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  admin: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function MembersListPanel({ members, userGroups, onRemove }: Props) {
  const [memberSearch, setMemberSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState<'all' | 'unassigned' | string>('all')

  const q = memberSearch.trim().toLowerCase()

  const filtered = members.filter((member) => {
    const matchesSearch =
      !q ||
      member.name.toLowerCase().includes(q) ||
      member.email.toLowerCase().includes(q) ||
      (member.student_id || '').toLowerCase().includes(q)
    const gName = userGroups.get(member.id)
    const matchesGroup =
      groupFilter === 'all' ||
      (groupFilter === 'unassigned' && !gName) ||
      gName === groupFilter
    return matchesSearch && matchesGroup
  })

  const groupNames = Array.from(new Set(Array.from(userGroups.values()))).sort()

  return (
    <div className="space-y-4">
      {/* Search + filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search by name, email, or student ID…"
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground">
            <LayoutList className="h-4 w-4" />
            {groupFilter === 'all'
              ? 'All Members'
              : groupFilter === 'unassigned'
              ? 'No Group'
              : `Group: ${groupFilter}`}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setGroupFilter('all')}>All Members</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setGroupFilter('unassigned')}>No Group</DropdownMenuItem>
            {groupNames.map((gName) => (
              <DropdownMenuItem key={gName} onClick={() => setGroupFilter(gName)}>
                Group: {gName}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Member cards */}
      {filtered.length === 0 ? (
        <p className="text-muted-foreground">
          {members.length === 0 ? 'No members found.' : 'No members match your filter.'}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((member) => {
            const groupName = userGroups.get(member.id)
            return (
              <Card key={member.id} className="p-4">
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage
                      src={getProfilePictureUrl(member.profile_picture_url)}
                      alt={member.name}
                    />
                    <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{member.name}</span>
                      <Badge
                        className={roleColors[member.role] || 'bg-gray-100 text-gray-700'}
                      >
                        {member.role}
                      </Badge>
                      {groupName && <Badge variant="outline">Group: {groupName}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {member.email}
                      {member.student_id && <span> | ID: {member.student_id}</span>}
                    </p>
                  </div>
                  {isTeacher() && member.role === 'student' && onRemove && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => onRemove(member)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
