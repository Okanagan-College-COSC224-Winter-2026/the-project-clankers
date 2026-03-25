import { useParams } from "react-router-dom";
import TabNavigation from "../components/TabNavigation";
import { useEffect, useState, useCallback, useRef } from "react";
import StatusMessage from "../components/StatusMessage";
import ConfirmDialog from "../components/ConfirmDialog";
import { listClasses } from "../util/api";
import { importCSV } from "../util/csv";
import { isTeacher } from "../util/login";
import RosterUploadResult from "../components/RosterUploadResult";
import ErrorModal from "../components/ErrorModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface RosterUploadResultData {
  message: string;
  enrolled_count: number;
  created_count: number;
  existing_count?: number;
  new_students?: Array<{
    email: string;
    student_id: string;
    temp_password: string;
  }>;
  enrolled_existing_students?: Array<{
    email: string;
    student_id: string;
    name: string;
  }>;
  existing_students?: Array<{
    email: string;
    student_id: string;
    name: string;
  }>;
}

interface CourseGroup {
  id: number;
  name: string;
  courseID: number;
  member_count?: number;
}

export default function ClassGroupManagement() {
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
  const [className, setClassName] = useState<string>("");
  const [rosterResult, setRosterResult] = useState<RosterUploadResultData | null>(null);
  const [isUploadingRoster, setIsUploadingRoster] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const isCreating = useRef(false);
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: 'danger' | 'warning' | 'info' | 'success';
    onConfirm: () => void;
  } | null>(null);

  const loadGroups = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:5000/classes/${id}/groups`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setGroups(data);

        // Load members for each group
        const membersMap = new Map();
        for (const group of data) {
          const membersResp = await fetch(
            `http://localhost:5000/classes/${id}/groups/${group.id}/members`,
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
  }, [id]);

  const loadUnassignedStudents = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:5000/classes/${id}/members/unassigned`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setUnassignedStudents(data);
      }
    } catch (error) {
      console.error("Error loading unassigned students:", error);
    }
  }, [id]);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadGroups(), loadUnassignedStudents()]);
    setLoading(false);
  }, [loadGroups, loadUnassignedStudents]);

  useEffect(() => {
    loadData();
    // Load class name
    (async () => {
      try {
        const classes = await listClasses();
        const cls = classes.find((c: { id: number }) => c.id === Number(id));
        if (cls) setClassName(cls.name);
      } catch (e) {
        console.error("Error loading class name:", e);
      }
    })();
  }, [loadData, id]);

  const showStatus = (message: string, type: "error" | "success") => {
    // Cancel any pending clear timeout
    if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    setStatusMessage("");
    setTimeout(() => {
      setStatusMessage(message);
      setStatusType(type);
    }, 0);
    statusTimeoutRef.current = setTimeout(() => setStatusMessage(""), 4100);
  };

  const createGroup = async () => {
    if (isCreating.current) return;

    if (!newGroupName.trim()) {
      showStatus("Group name cannot be empty", "error");
      return;
    }

    // Check for duplicate group name
    if (groups.some(g => g.name.toLowerCase() === newGroupName.trim().toLowerCase())) {
      showStatus("A group with that name already exists", "error");
      return;
    }

    isCreating.current = true;
    try {
      const response = await fetch(`http://localhost:5000/classes/${id}/groups`, {
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
      isCreating.current = false;
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

    try {
      const response = await fetch(`http://localhost:5000/classes/${id}/groups/${groupId}`, {
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

  const deleteGroup = async (groupId: number) => {
    setConfirmDialog({
      title: 'Delete Group',
      message: 'Are you sure you want to delete this group? Members will become unassigned.',
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const response = await fetch(`http://localhost:5000/classes/${id}/groups/${groupId}`, {
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

  const addStudentToGroup = async (studentId: number, groupId: number) => {
    try {
      const response = await fetch(
        `http://localhost:5000/classes/${id}/groups/${groupId}/members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ userID: studentId }),
        }
      );

      if (response.ok) {
        await loadData();
        showStatus("Student added to group", "success");
      } else {
        const error = await response.json();
        showStatus(error.msg || "Failed to add student to group", "error");
      }
    } catch (error) {
      console.error("Error adding student to group:", error);
      showStatus("Error adding student to group", "error");
    }
  };

  const removeStudentFromGroup = async (studentId: number, groupId: number) => {
    try {
      const response = await fetch(
        `http://localhost:5000/classes/${id}/groups/${groupId}/members/${studentId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (response.ok) {
        await loadData();
        showStatus("Student removed from group", "success");
      } else {
        const error = await response.json();
        showStatus(error.msg || "Failed to remove student from group", "error");
      }
    } catch (error) {
      console.error("Error removing student from group:", error);
      showStatus("Error removing student from group", "error");
    }
  };

  const randomizeGroups = async () => {
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
              `http://localhost:5000/classes/${id}/groups/${groupId}/members`,
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

  const handleRosterUpload = () => {
    if (isUploadingRoster) return;
    setIsUploadingRoster(true);
    importCSV(
      id as string,
      (result) => {
        setIsUploadingRoster(false);
        setRosterResult(result);
        loadData();
      },
      (error) => {
        setIsUploadingRoster(false);
        const errorMessage = error instanceof Error ? error.message : String(error);
        setUploadError(errorMessage);
      },
      () => {
        setIsUploadingRoster(false);
      }
    );
  };

  if (loading) {
    return <div className="text-center py-12">Loading groups...</div>;
  }

  return (
    <>
      <div className="flex flex-row justify-between items-center p-3">
        <h2 className="text-xl font-semibold">{className || "Loading..."}</h2>
        <div>
          {isTeacher() ? (
            <Button onClick={handleRosterUpload} disabled={isUploadingRoster}>
              {isUploadingRoster ? 'Opening...' : 'Add Students via CSV'}
            </Button>
          ) : null}
        </div>
      </div>

      <TabNavigation
        tabs={
          isTeacher()
            ? [
                {
                  label: "Home",
                  path: `/classes/${id}/home`,
                },
                {
                  label: "Members",
                  path: `/classes/${id}/members`,
                },
                {
                  label: "Groups",
                  path: `/classes/${id}/groups`,
                },
                {
                  label: "Student Submissions",
                  path: `/classes/${id}/student-submissions`,
                },
                {
                  label: "Rubrics",
                  path: `/classes/${id}/rubrics`,
                },
              ]
            : [
                {
                  label: "Home",
                  path: `/classes/${id}/home`,
                },
                {
                  label: "Members",
                  path: `/classes/${id}/members`,
                },
              ]
        }
      />

      {statusMessage && <StatusMessage message={statusMessage} type={statusType} />}

      <div className="grid grid-cols-2 gap-6 p-5 max-w-7xl mx-auto">
        {/* Left side: Unassigned Students */}
        <Card className="h-[72vh] flex flex-col">
          <CardHeader className="border-b pb-4">
            <CardTitle>Unassigned Students ({unassignedStudents.length})</CardTitle>
            {unassignedStudents.length > 0 && groups.length > 0 && (
              <Button onClick={randomizeGroups} className="mt-2">
                Randomize Groups
              </Button>
            )}
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            {unassignedStudents.length === 0 ? (
              <p className="text-center text-muted-foreground italic py-8">All students are assigned to groups</p>
            ) : (
              <div className="flex flex-col gap-1">
                {unassignedStudents.map((student) => (
                  <div key={student.id} className="flex justify-between items-center px-3 py-2 border-b gap-4 rounded-md hover:bg-muted/50">
                    <div className="flex flex-col flex-1 min-w-0">
                      <strong className="truncate">{student.name}</strong>
                      <span className="text-sm text-muted-foreground truncate">{student.email}</span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          Add to group
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {groups.map((group) => (
                          <DropdownMenuItem
                            key={group.id}
                            onClick={() => addStudentToGroup(student.id, group.id)}
                          >
                            {group.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right side: Groups */}
        <Card className="h-[72vh] flex flex-col">
          <CardHeader className="border-b pb-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <CardTitle>Groups ({groups.length})</CardTitle>
              <div className="flex gap-2 items-center">
                <Input
                  type="text"
                  placeholder="New group name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && createGroup()}
                  className="w-40"
                />
                <Button onClick={createGroup} disabled={isCreating.current}>Create Group</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            {groups.length === 0 ? (
              <p className="text-center text-muted-foreground italic py-8">No groups created yet</p>
            ) : (
              <div className="flex flex-col gap-2">
                {groups.map((group) => {
                  const members = groupMembers.get(group.id) || [];
                  const isEditing = editingGroupId === group.id;

                  return (
                    <Card key={group.id} size="sm">
                      <CardHeader className="border-b pb-2">
                        {isEditing ? (
                          <div className="flex gap-2 items-center">
                            <Input
                              type="text"
                              value={editingGroupName}
                              onChange={(e) => setEditingGroupName(e.target.value)}
                              onKeyPress={(e) =>
                                e.key === "Enter" && renameGroup(group.id, editingGroupName)
                              }
                              autoFocus
                              className="flex-1"
                            />
                            <Button size="sm" onClick={() => renameGroup(group.id, editingGroupName)}>
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setEditingGroupId(null); setEditingGroupName(""); }}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center">
                            <CardTitle>{group.name} ({members.length})</CardTitle>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingGroupId(group.id);
                                  setEditingGroupName(group.name);
                                }}
                              >
                                Edit
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => deleteGroup(group.id)}>
                                Delete
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardHeader>
                      <CardContent>
                        {members.length === 0 ? (
                          <p className="text-center text-muted-foreground italic py-4 text-sm">No members in this group</p>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {members.map((member) => (
                              <div key={member.id} className="flex justify-between items-center px-3 py-2 border-b gap-4 rounded-md hover:bg-muted/50">
                                <div className="flex flex-col flex-1 min-w-0">
                                  <strong className="truncate text-sm">{member.name}</strong>
                                  <span className="text-xs text-muted-foreground truncate">{member.email}</span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => removeStudentFromGroup(member.id, group.id)}
                                >
                                  Remove
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
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

      {rosterResult && (
        <RosterUploadResult
          enrolledCount={rosterResult.enrolled_count}
          createdCount={rosterResult.created_count}
          existingCount={rosterResult.existing_count}
          newStudents={rosterResult.new_students}
          enrolledExistingStudents={rosterResult.enrolled_existing_students}
          existingStudents={rosterResult.existing_students}
          onClose={() => setRosterResult(null)}
        />
      )}

      {uploadError && (
        <ErrorModal
          title="CSV Upload Error"
          message={uploadError}
          onClose={() => setUploadError(null)}
        />
      )}
    </>
  );
}
