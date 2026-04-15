import React, { useEffect, useState, useRef } from "react";
import {
  getUserId,
  getCourseGroups,
  getGroupMembers,
  getMyGroup,
  getUnassignedStudents,
  createCourseGroup,
  deleteCourseGroup,
  addGroupMember,
  removeGroupMember,
  getAssignmentDetails,
  listClasses,
} from "../util/api";
import { useParams, Link } from "react-router-dom";
import TabNavigation from "../components/TabNavigation";
import StatusMessage from "../components/StatusMessage";
import { isTeacher } from "../util/login";
import Textbox from "../components/Textbox";
import { ChevronRight } from "lucide-react";

interface GroupMember {
  id: number;
  name: string;
  email: string;
  originalGroupId?: number;
}

interface GroupData {
  id: number;
  name: string;
  members: GroupMember[];
}

function fisherYates<T>(array: T[]): T[] {
  let m = array.length, t, i;

  while (m) {
    i = Math.floor(Math.random() * m--);

    t = array[m];
    array[m] = array[i];
    array[i] = t;
  }

  return array;
}

export default function Group() {
  const { id } = useParams();
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [unassigned, setUnassigned] = useState<GroupMember[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<number>(-1);
  const [groupName, setGroupName] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'error' | 'success'>('error');
  const [assignmentName, setAssignmentName] = useState<string>("");
  const [courseId, setCourseId] = useState<number | null>(null);
  const [courseName, setCourseName] = useState<string>("");
  const [stuGroup, setStuGroup] = useState<User[]>([]);
  const [saving, setSaving] = useState(false);
  const isCreating = useRef(false);

  const randomize = () => {
    // Collect all members from all groups + unassigned
    const allMembers: GroupMember[] = [];
    for (const group of groups) {
      for (const member of group.members) {
        allMembers.push({ ...member });
      }
    }
    for (const member of unassigned) {
      allMembers.push({ ...member });
    }

    if (groups.length === 0) return;

    const shuffled = fisherYates([...allMembers]);
    const membersPerGroup = Math.floor(shuffled.length / groups.length);
    const newGroups = groups.map(g => ({ ...g, members: [] as GroupMember[] }));

    let i = 0;
    for (const group of newGroups) {
      for (let j = 0; j < membersPerGroup && i < shuffled.length; j++) {
        group.members.push(shuffled[i++]);
      }
    }
    // Distribute remaining members
    let groupIdx = 0;
    while (i < shuffled.length) {
      newGroups[groupIdx % newGroups.length].members.push(shuffled[i++]);
      groupIdx++;
    }

    setGroups(newGroups);
    setUnassigned([]);
  };

  useEffect(() => {
    (async () => {
      // Fetch assignment details to get courseId
      let cId: number | null = null;
      try {
        const assignmentData = await getAssignmentDetails(Number(id));
        if (assignmentData?.name) setAssignmentName(assignmentData.name);
        if (assignmentData?.courseID) {
          cId = assignmentData.courseID;
          setCourseId(cId);
          const classes = await listClasses();
          const cls = classes.find((c: { id: number }) => c.id === cId);
          if (cls) setCourseName(cls.name);
        }
      } catch (error) {
        console.error('Error fetching assignment details:', error);
        return;
      }

      if (!cId) return;

      if (isTeacher()) {
        // Teacher: load all groups, members, and unassigned
        const courseGroups = await getCourseGroups(cId);
        const groupsWithMembers: GroupData[] = [];
        for (const g of courseGroups) {
          const members: User[] = await getGroupMembers(cId, g.id);
          groupsWithMembers.push({
            id: g.id,
            name: g.name,
            members: members.map(m => ({ id: m.id, name: m.name, email: m.email, originalGroupId: g.id })),
          });
        }
        setGroups(groupsWithMembers);

        const ua: User[] = await getUnassignedStudents(cId);
        setUnassigned(ua.map(u => ({ id: u.id, name: u.name, email: u.email })));
      } else {
        // Student: load my group members
        const myGroup = await getMyGroup(cId);
        if (myGroup.groupId) {
          const members: User[] = await getGroupMembers(cId, myGroup.groupId);
          // Exclude self from display
          const stuIdResponse = await getUserId();
          setStuGroup(members.filter(m => m.id !== stuIdResponse.id));
        }
      }
    })();
  }, [id]);

  return (
    <>
      <div className="flex h-16 items-center border-b border-border px-6">
        <nav className="flex items-center gap-1 text-sm">
          {courseId ? (
            <Link to={`/classes/${courseId}/home`} className="text-muted-foreground hover:text-foreground transition-colors">{courseName || '...'}</Link>
          ) : (
            <span className="text-muted-foreground">...</span>
          )}
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
          <span className="font-semibold text-foreground">{assignmentName || '...'}</span>
        </nav>
      </div>

      <TabNavigation
        tabs={
          isTeacher()
            ? [
                { label: "Home", path: `/assignments/${id}` },
                { label: "Members", path: `/assignments/${id}/members` },
                { label: "Groups", path: `/assignments/${id}/groups` },
                { label: "Rubric", path: `/assignments/${id}/rubric` },
                { label: "Student Submissions", path: `/assignments/${id}/student-submissions` },
                { label: "Manage", path: `/assignments/${id}/manage` },
              ]
            : [
                { label: "Home", path: `/assignments/${id}` },
                { label: "Members", path: `/assignments/${id}/members` },
                { label: "Submission", path: `/assignments/${id}/submission` },
                { label: "Peer Reviews", path: `/assignments/${id}/peer-reviews` },
              ]
        }
      />

      <StatusMessage message={statusMessage} type={statusType} />

      <div className="p-6">
        {isTeacher() ? (
          <>
            <div className="flex gap-6 mb-6">
              <table className="border-collapse w-full max-w-md border border-border rounded-lg overflow-hidden">
                <thead>
                <tr>
                  <th className="bg-muted px-4 py-3 text-left font-semibold text-foreground">Unassigned</th>
                </tr>
                </thead>
                <tbody>
                {unassigned.map((ua) => (
                  <tr key={ua.id} className="border-t border-border">
                    <td>
                      <span className="inline-block px-4 py-2 text-foreground">{ua.name}</span>
                      <button
                        className="ml-2 px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                        onClick={() => {
                          if (selectedGroup === -1) return;
                          setUnassigned(prev => prev.filter(m => m.id !== ua.id));
                          setGroups(prev => prev.map(g =>
                            g.id === selectedGroup
                              ? { ...g, members: [...g.members, { ...ua }] }
                              : g
                          ));
                        }}
                      >
                        Move
                      </button>
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>

              <table className="border-collapse w-full max-w-md border border-border rounded-lg overflow-hidden">
                <thead>
                <tr>
                  <th className="bg-muted px-4 py-3 text-left font-semibold text-foreground">Groups</th>
                </tr>
                </thead>
                <tbody>
                {groups.map((group) => (
                  <React.Fragment key={group.id}>
                    <tr
                      className={`cursor-pointer px-4 py-2 flex items-center gap-2 border-t border-border hover:bg-accent transition-colors ${
                        group.id === selectedGroup ? "bg-accent" : ""
                      }`}
                      onClick={() => setSelectedGroup(group.id)}
                    >
                      <td className="w-full">
                        <div className="flex items-center gap-2 px-4 py-2">
                          <img src="/icons/arrow.svg" alt="arrow" className="w-3 h-3" />
                          {group.name}
                        </div>
                      </td>
                    </tr>

                    {selectedGroup === group.id &&
                      group.members.map((stu) => (
                        <tr key={stu.id} className="border-t border-border bg-muted/50">
                          <td>
                            <span className="inline-block px-4 py-2 pl-8 text-foreground">
                              {stu.name}
                            </span>
                            <button
                              className="ml-2 px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                              onClick={() => {
                                setGroups(prev => prev.map(g =>
                                  g.id === group.id
                                    ? { ...g, members: g.members.filter(m => m.id !== stu.id) }
                                    : g
                                ));
                                setUnassigned(prev => [...prev, { ...stu, originalGroupId: group.id }]);
                              }}
                            >
                              Move
                            </button>
                          </td>
                        </tr>
                      ))}
                  </React.Fragment>
                ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-3 mb-4">
            <button
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50"
              disabled={saving}
              onClick={async () => {
                if (!courseId) return;
                setSaving(true);
                try {
                  // Add all members to their assigned groups (backend auto-removes from old group)
                  for (const group of groups) {
                    for (const member of group.members) {
                      await addGroupMember(courseId, group.id, member.id);
                    }
                  }
                  // Remove unassigned members from their original groups
                  for (const member of unassigned) {
                    if (member.originalGroupId) {
                      await removeGroupMember(courseId, member.originalGroupId, member.id);
                    }
                  }
                  setStatusType('success');
                  setStatusMessage('Changes saved!');
                } catch {
                  setStatusType('error');
                  setStatusMessage('Failed to save changes');
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? 'Saving...' : 'Confirm Changes'}
            </button>

            <button
              className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors font-medium"
              onClick={randomize}
            >
              Randomize
            </button>
            <button
              className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors font-medium"
              onClick={async () => {
                if (selectedGroup === -1 || !courseId) return;
                const group = groups.find(g => g.id === selectedGroup);
                if (!group) return;
                try {
                  await deleteCourseGroup(courseId, selectedGroup);
                  // Move group members to unassigned
                  setUnassigned(prev => [...prev, ...group.members]);
                  setGroups(prev => prev.filter(g => g.id !== selectedGroup));
                  setSelectedGroup(-1);
                  setStatusType('success');
                  setStatusMessage('Group deleted!');
                } catch {
                  setStatusType('error');
                  setStatusMessage('Failed to delete group');
                }
              }}>
              Delete Selected Group
              </button>
            </div>

            <div className="flex gap-3 items-center">
              <button
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                onClick={async () => {
                  if (!courseId || !groupName.trim() || isCreating.current) return;
                  isCreating.current = true;
                  try {
                    const newGroup = await createCourseGroup(courseId, groupName.trim());
                    setGroups(prev => [...prev, { id: newGroup.id, name: newGroup.name, members: [] }]);
                    setGroupName('');
                    setStatusType('success');
                    setStatusMessage('Group created!');
                  } catch {
                    setStatusType('error');
                    setStatusMessage('Failed to create group');
                  } finally {
                    isCreating.current = false;
                  }
                }}
                >
                  Create New Group
              </button>
              <Textbox
                placeholder="group name"
                onInput={setGroupName}
                className="w-48"
                >
              </Textbox>
            </div>
          </>
        ) : (
          <div className="mt-4">
            <table className="border-collapse w-full max-w-md border border-border rounded-lg overflow-hidden">
              <thead>
              <tr>
                <th className="bg-muted px-4 py-3 text-left font-semibold text-foreground">My group</th>
              </tr>
              </thead>
              <tbody>
              {stuGroup.map((stus) => {
                return <tr key={stus.id} className="border-t border-border"><td className="px-4 py-2 text-foreground">{stus.name || stus.id}</td></tr>;
              })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
