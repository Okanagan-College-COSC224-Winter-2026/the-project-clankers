import { useParams, Link } from "react-router-dom";
import TabNavigation from "../components/TabNavigation";
import { useEffect, useState, useCallback } from "react";
import StatusMessage from "../components/StatusMessage";
import ConfirmDialog from "../components/ConfirmDialog";
import { getAssignmentDetails, listClasses } from "../util/api";
import { isTeacher } from "../util/login";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, Shuffle, Users, UserPlus } from "lucide-react";

interface CourseGroup {
  id: number;
  name: string;
  courseID: number;
  member_count?: number;
}

export default function AssignmentGroups() {
  const { id } = useParams();
  const [groups, setGroups] = useState<CourseGroup[]>([]);
  const [unassignedStudents, setUnassignedStudents] = useState<User[]>([]);
  const [groupMembers, setGroupMembers] = useState<Map<number, User[]>>(new Map());
  const [newGroupName, setNewGroupName] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState<"error" | "success">("success");
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: 'danger' | 'warning' | 'info' | 'success';
    onConfirm: () => void;
  } | null>(null);

  const [assignmentName, setAssignmentName] = useState<string>("");
  const [courseId, setCourseId] = useState<number | null>(null);
  const [courseName, setCourseName] = useState<string>("");

  const loadGroups = useCallback(async () => {
    if (!courseId) return;

    try {
      const response = await fetch(`http://localhost:5000/classes/${courseId}/groups`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setGroups(data);

        // Load members for each group
        const membersMap = new Map();
        for (const group of data) {
          const membersResp = await fetch(
            `http://localhost:5000/classes/${courseId}/groups/${group.id}/members`,
            { credentials: "include" }
          );
          if (membersResp.ok) {
            const members = await membersResp.json();
            membersMap.set(group.id, members);
          }
        }
        setGroupMembers(membersMap);
      }
    } catch (error) {
      console.error("Error loading groups:", error);
      showStatus("Error loading groups", "error");
    }
  }, [courseId]);

  const loadUnassignedStudents = useCallback(async () => {
    if (!courseId) return;

    try {
      const response = await fetch(`http://localhost:5000/classes/${courseId}/members/unassigned`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setUnassignedStudents(data);
      }
    } catch (error) {
      console.error("Error loading unassigned students:", error);
    }
  }, [courseId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadGroups(), loadUnassignedStudents()]);
    setLoading(false);
  }, [loadGroups, loadUnassignedStudents]);

  useEffect(() => {
    (async () => {
      try {
        const assignmentData = await getAssignmentDetails(Number(id));
        if (assignmentData) {
          setAssignmentName(assignmentData.name || "");
          setCourseId(assignmentData.courseID);
          // Fetch course name
          try {
            const classes = await listClasses();
            const course = classes.find((c: { id: number }) => c.id === assignmentData.courseID);
            if (course) setCourseName(course.name);
          } catch (e) { console.error(e); }
        }
      } catch (error) {
        console.error('Error fetching assignment details:', error);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (courseId) {
      loadData();
    }
  }, [courseId, loadData]);

  const showStatus = (message: string, type: "error" | "success") => {
    setStatusMessage(message);
    setStatusType(type);
    setTimeout(() => setStatusMessage(""), 4100);
  };

  const createGroup = async () => {
    if (isCreating) return;

    if (!newGroupName.trim()) {
      showStatus("Group name cannot be empty", "error");
      return;
    }

    // Check for duplicate group name
    if (groups.some(g => g.name.toLowerCase() === newGroupName.trim().toLowerCase())) {
      showStatus("A group with that name already exists", "error");
      return;
    }

    if (!courseId) {
      showStatus("Course not found", "error");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch(`http://localhost:5000/classes/${courseId}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newGroupName }),
      });

      if (response.ok) {
        setNewGroupName("");
        await loadData();
        showStatus("Group created successfully", "success");
      } else {
        const error = await response.json();
        showStatus(error.msg || "Failed to create group", "error");
      }
    } catch (error) {
      console.error("Error creating group:", error);
      showStatus("Error creating group", "error");
    } finally {
      setIsCreating(false);
    }
  };

  const renameGroup = async (groupId: number, newName: string) => {
    if (!newName.trim()) {
      showStatus("Group name cannot be empty", "error");
      return;
    }

    // Check for duplicate group name
    if (groups.some(g => g.id !== groupId && g.name.toLowerCase() === newName.trim().toLowerCase())) {
      showStatus("A group with that name already exists", "error");
      return;
    }

    if (!courseId) return;

    try {
      const response = await fetch(`http://localhost:5000/classes/${courseId}/groups/${groupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newName }),
      });

      if (response.ok) {
        setEditingGroupId(null);
        setEditingGroupName("");
        await loadData();
        showStatus("Group renamed successfully", "success");
      } else {
        const error = await response.json();
        showStatus(error.msg || "Failed to rename group", "error");
      }
    } catch (error) {
      console.error("Error renaming group:", error);
      showStatus("Error renaming group", "error");
    }
  };

  const deleteGroupHandler = async (groupId: number) => {
    if (!courseId) return;

    setConfirmDialog({
      title: 'Delete Group',
      message: 'Are you sure you want to delete this group? Members will become unassigned.',
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const response = await fetch(`http://localhost:5000/classes/${courseId}/groups/${groupId}`, {
            method: "DELETE",
            credentials: "include",
          });

          if (response.ok) {
            await loadData();
            showStatus("Group deleted successfully", "success");
          } else {
            const error = await response.json();
            showStatus(error.msg || "Failed to delete group", "error");
          }
        } catch (error) {
          console.error("Error deleting group:", error);
          showStatus("Error deleting group", "error");
        }
      },
    });
  };

  const addMemberToGroup = async (userId: number, groupId: number) => {
    if (!courseId) return;

    try {
      const response = await fetch(
        `http://localhost:5000/classes/${courseId}/groups/${groupId}/members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ userID: userId }),
        }
      );

      if (response.ok) {
        await loadData();
        showStatus("Member added to group", "success");
      } else {
        const error = await response.json();
        showStatus(error.msg || "Failed to add member", "error");
      }
    } catch (error) {
      console.error("Error adding member:", error);
      showStatus("Error adding member", "error");
    }
  };

  const removeMemberFromGroup = async (userId: number, groupId: number) => {
    if (!courseId) return;

    try {
      const response = await fetch(
        `http://localhost:5000/classes/${courseId}/groups/${groupId}/members/${userId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (response.ok) {
        await loadData();
        showStatus("Member removed from group", "success");
      } else {
        const error = await response.json();
        showStatus(error.msg || "Failed to remove member", "error");
      }
    } catch (error) {
      console.error("Error removing member:", error);
      showStatus("Error removing member", "error");
    }
  };

  const randomizeGroups = async () => {
    if (!courseId) return;

    if (groups.length === 0) {
      showStatus("Create groups first before randomizing", "error");
      return;
    }

    if (unassignedStudents.length === 0) {
      showStatus("No unassigned students to distribute", "error");
      return;
    }

    // Shuffle students for random distribution
    const shuffled = [...unassignedStudents].sort(() => Math.random() - 0.5);

    // Calculate which groups we can fill to a minimum size of 2
    const groupInfo = groups.map((g) => ({
      group: g,
      existing: (groupMembers.get(g.id) || []).length,
    }));

    // Sort: groups with more existing members first (cheaper to reach 2)
    groupInfo.sort((a, b) => b.existing - a.existing);

    let studentsAvailable = shuffled.length;
    const selectedGroups: typeof groupInfo = [];

    for (const gi of groupInfo) {
      const needed = Math.max(0, 2 - gi.existing);
      if (studentsAvailable >= needed) {
        selectedGroups.push(gi);
        studentsAvailable -= needed;
      }
    }

    if (selectedGroups.length === 0) {
      showStatus("Not enough unassigned students to form groups of at least 2", "error");
      return;
    }

    const unusedCount = groups.length - selectedGroups.length;
    const confirmMsg = unusedCount > 0
      ? `Distribute ${shuffled.length} students across ${selectedGroups.length} of ${groups.length} groups? (${unusedCount} group(s) skipped to maintain minimum size of 2)`
      : `Randomly distribute ${shuffled.length} unassigned students across ${groups.length} groups?`;

    setConfirmDialog({
      title: 'Randomize Groups',
      message: confirmMsg,
      confirmLabel: 'Randomize',
      variant: 'success',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const assignments: { studentId: number; groupId: number }[] = [];
          let idx = 0;

          // Phase 1: bring every selected group up to minimum 2
          for (const gi of selectedGroups) {
            const needed = Math.max(0, 2 - gi.existing);
            for (let j = 0; j < needed; j++) {
              assignments.push({ studentId: shuffled[idx].id, groupId: gi.group.id });
              idx++;
            }
          }

          // Phase 2: round-robin remaining students across selected groups
          while (idx < shuffled.length) {
            for (const gi of selectedGroups) {
              if (idx >= shuffled.length) break;
              assignments.push({ studentId: shuffled[idx].id, groupId: gi.group.id });
              idx++;
            }
          }

          // Execute all assignments
          let successCount = 0;
          for (const { studentId, groupId } of assignments) {
            const response = await fetch(
              `http://localhost:5000/classes/${courseId}/groups/${groupId}/members`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ userID: studentId }),
              }
            );
            if (response.ok) successCount++;
          }

          await loadData();
          showStatus(`Successfully distributed ${successCount} students across ${selectedGroups.length} groups`, "success");
        } catch (error) {
          console.error("Error randomizing groups:", error);
          showStatus("Error randomizing groups", "error");
        }
      },
    });
  };

  if (loading && groups.length === 0) {
    return <div className="p-5">Loading groups...</div>;
  }

  return (
    <>
      {courseId && (
        <div className="py-2 px-3">
          <Link to={`/classes/${courseId}/home`} className="text-muted-foreground no-underline text-sm hover:text-foreground">
            ← {courseName || "Back to class"}
          </Link>
        </div>
      )}
      <div className="flex flex-row justify-between items-center px-3 pb-3">
        <h2>{assignmentName || "Loading..."}</h2>
      </div>

      <TabNavigation
        tabs={
          isTeacher()
            ? [
                {
                  label: "Home",
                  path: `/assignments/${id}`,
                },
                {
                  label: "Members",
                  path: `/assignments/${id}/members`,
                },
                {
                  label: "Groups",
                  path: `/assignments/${id}/groups`,
                },
                {
                  label: "Rubric",
                  path: `/assignments/${id}/rubric`,
                },
                {
                  label: "Student Submissions",
                  path: `/assignments/${id}/student-submissions`,
                },
                {
                  label: "Manage",
                  path: `/assignments/${id}/manage`,
                }
              ]
            : [
                {
                  label: "Home",
                  path: `/assignments/${id}`,
                },
                {
                  label: "Members",
                  path: `/assignments/${id}/members`,
                },
                {
                  label: "Submission",
                  path: `/assignments/${id}/submission`,
                },
              ]
        }
      />

      {statusMessage && <StatusMessage message={statusMessage} type={statusType} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-5 max-w-7xl mx-auto">
        {/* Unassigned Students Panel */}
        <div className="bg-background rounded-xl p-5 border shadow-sm h-[72vh] lg:h-[72vh] max-h-[60vh] lg:max-h-none flex flex-col transition-shadow hover:shadow-md">
          <h3 className="m-0 mb-3 text-foreground text-sm font-semibold tracking-tight">
            Unassigned Students ({unassignedStudents.length})
          </h3>
          {isTeacher() && unassignedStudents.length > 0 && groups.length > 0 && (
            <button
              onClick={randomizeGroups}
              className="px-3.5 py-1.5 text-sm bg-primary text-primary-foreground border-none rounded-md cursor-pointer font-semibold mb-3 hover:brightness-110 active:scale-[0.97] transition-all w-full sm:w-auto"
            >
              Randomize Groups
            </button>
          )}
          <div className="flex flex-col flex-1 overflow-y-auto min-h-0 -mx-5 px-5">
            {unassignedStudents.length === 0 ? (
              <p className="text-center text-muted-foreground italic py-8 px-4 m-0 text-sm opacity-70">
                All students are assigned to groups
              </p>
            ) : (
              unassignedStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex justify-between items-center px-3 py-2.5 border-b border-border/60 gap-4 rounded-md transition-colors hover:bg-muted/50 last:border-b-0 flex-wrap sm:flex-nowrap"
                >
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <strong className="text-sm font-semibold text-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                      {student.name}
                    </strong>
                    <span className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                      {student.email}
                    </span>
                  </div>
                  {isTeacher() && groups.length > 0 && (
                    <div
                      className="shrink-0 relative w-full sm:w-auto"
                      ref={openDropdown === student.id ? dropdownRef : null}
                    >
                      <button
                        className="px-3 py-1.5 border border-border rounded-md bg-background text-xs cursor-pointer text-muted-foreground font-inherit whitespace-nowrap transition-all hover:border-muted-foreground hover:text-foreground hover:shadow-sm focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1 w-full sm:w-auto text-center sm:text-left"
                        onClick={() => setOpenDropdown(openDropdown === student.id ? null : student.id)}
                      >
                        Add to group ▾
                      </button>
                      {openDropdown === student.id && (
                        <div className="absolute top-full right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-10 min-w-[160px] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                          {groups.map((group) => (
                            <button
                              key={group.id}
                              className="block w-full px-3.5 py-2 border-none bg-transparent text-sm text-foreground cursor-pointer text-left font-inherit transition-colors hover:bg-muted/60 active:bg-muted"
                              onClick={() => {
                                addMemberToGroup(student.id, group.id);
                                setOpenDropdown(null);
                              }}
                            >
                              {group.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Groups Panel */}
        <div className="bg-background rounded-xl p-5 border shadow-sm h-auto lg:h-[72vh] max-h-[60vh] lg:max-h-none flex flex-col transition-shadow hover:shadow-md">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 flex-wrap gap-2">
            <h3 className="m-0 text-foreground text-sm font-semibold tracking-tight">
              Groups ({groups.length})
            </h3>
            {isTeacher() && (
              <div className="flex gap-2 items-center w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="New group name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && createGroup()}
                  className="py-1.5 px-3 border border-border rounded-md text-sm w-full sm:w-[150px] font-inherit text-foreground bg-background transition-all placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <Button onClick={createGroup} disabled={isCreating.current}>Create Group</Button>
              </div>
            )}
          </div>

          <div className="flex flex-col flex-1 overflow-y-auto min-h-0 -mx-5 px-5">
            {groups.length === 0 ? (
              <p className="text-center text-muted-foreground italic py-8 px-4 m-0 text-sm opacity-70">
                No groups created yet
              </p>
            ) : (
              groups.map((group) => {
                const members = groupMembers.get(group.id) || [];
                const isEditing = editingGroupId === group.id;

                return (
                  <div
                    key={group.id}
                    className="border border-border rounded-lg p-4 mb-2.5 transition-all hover:shadow-sm hover:border-muted-foreground"
                  >
                    <div className="flex justify-between items-center mb-2.5 pb-2 border-b border-border/60">
                      {isEditing ? (
                        <div className="flex gap-1.5 flex-1">
                          <input
                            type="text"
                            value={editingGroupName}
                            onChange={(e) => setEditingGroupName(e.target.value)}
                            onKeyPress={(e) =>
                              e.key === "Enter" && renameGroup(group.id, editingGroupName)
                            }
                            autoFocus
                            className="flex-1 py-1.5 px-2.5 border border-border rounded-md text-sm font-inherit text-foreground bg-background transition-all placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                          />
                          <button
                            onClick={() => renameGroup(group.id, editingGroupName)}
                            className="py-1.5 px-2.5 border-none rounded-md cursor-pointer text-sm min-w-[30px] transition-all active:scale-95 bg-primary text-primary-foreground hover:brightness-90"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => { setEditingGroupId(null); setEditingGroupName(""); }}
                            className="py-1.5 px-2.5 border-none rounded-md cursor-pointer text-sm min-w-[30px] transition-all active:scale-95 bg-secondary text-secondary-foreground hover:brightness-85"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <>
                          <h4 className="m-0 text-foreground text-sm font-semibold">
                            {group.name} ({members.length})
                          </h4>
                          {isTeacher() && (
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingGroupId(group.id);
                                  setEditingGroupName(group.name);
                                }}
                                className="py-1.5 px-3 border-none rounded-md text-xs font-medium cursor-pointer transition-all active:scale-[0.97] bg-primary text-primary-foreground hover:brightness-90"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteGroupHandler(group.id)}
                                className="py-1.5 px-3 border-none rounded-md text-xs font-medium cursor-pointer transition-all active:scale-[0.97] bg-destructive text-destructive-foreground hover:brightness-90"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="flex flex-col">
                      {members.length === 0 ? (
                        <p className="text-center text-muted-foreground italic py-8 px-4 m-0 text-sm opacity-70">
                          No members in this group
                        </p>
                      ) : (
                        members.map((member) => (
                          <div
                            key={member.id}
                            className="flex justify-between items-center px-3 py-2 border-b border-border/60 gap-4 rounded-md transition-colors hover:bg-muted/50 last:border-b-0"
                          >
                            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                              <strong className="text-sm font-semibold text-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                                {member.name}
                              </strong>
                              <span className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                                {member.email}
                              </span>
                            </div>
                            {isTeacher() && (
                              <button
                                onClick={() => removeMemberFromGroup(member.id, group.id)}
                                className="py-1 px-2.5 border-none rounded-md text-xs font-medium cursor-pointer transition-all active:scale-[0.97] bg-secondary text-secondary-foreground hover:brightness-85"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          variant={confirmDialog.variant}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </>
  );
}
