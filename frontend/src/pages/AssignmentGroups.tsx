import { useParams, Link } from "react-router-dom";
import TabNavigation from "../components/TabNavigation";
import { useEffect, useState, useCallback, useRef } from "react";
import Button from "../components/Button";
import StatusMessage from "../components/StatusMessage";
import ConfirmDialog from "../components/ConfirmDialog";
import { getAssignmentDetails, listClasses } from "../util/api";
import { isTeacher } from "../util/login";
import "./ClassGroupManagement.css";
import "./Assignment.css";

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
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isCreating = useRef(false);
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: 'danger' | 'warning' | 'info' | 'success';
    onConfirm: () => void;
  } | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
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

    if (!courseId) {
      showStatus("Course not found", "error");
      return;
    }

    isCreating.current = true;
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
    return <div style={{ padding: "20px" }}>Loading groups...</div>;
  }

  return (
    <>
      {courseId && (
        <div className="assignment-breadcrumb">
          <Link to={`/classes/${courseId}/home`}>← {courseName || "Back to class"}</Link>
        </div>
      )}
      <div className="AssignmentHeader">
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
              ]
        }
      />

      {statusMessage && <StatusMessage message={statusMessage} type={statusType} />}

      <div className="group-management-container">
        <div className="unassigned-section">
          <h3>Unassigned Students ({unassignedStudents.length})</h3>
          {isTeacher() && unassignedStudents.length > 0 && groups.length > 0 && (
            <button
              onClick={randomizeGroups}
              className="randomize-btn"
            >
              Randomize Groups
            </button>
          )}
          <div className="student-list">
            {unassignedStudents.length === 0 ? (
              <p className="empty-message">All students are assigned to groups</p>
            ) : (
              unassignedStudents.map((student) => (
                <div key={student.id} className="student-card">
                  <div className="student-info">
                    <strong>{student.name}</strong>
                    <span className="student-email">{student.email}</span>
                  </div>
                  {isTeacher() && groups.length > 0 && (
                    <div className="student-actions" ref={openDropdown === student.id ? dropdownRef : null}>
                      <button
                        className="group-dropdown-trigger"
                        onClick={() => setOpenDropdown(openDropdown === student.id ? null : student.id)}
                      >
                        Add to group ▾
                      </button>
                      {openDropdown === student.id && (
                        <div className="group-dropdown-menu">
                          {groups.map((group) => (
                            <button
                              key={group.id}
                              className="group-dropdown-item"
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

        <div className="groups-section">
          <div className="groups-header">
            <h3>Groups ({groups.length})</h3>
            {isTeacher() && (
              <div className="create-group">
                <input
                  type="text"
                  placeholder="New group name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && createGroup()}
                />
                <Button onClick={createGroup} disabled={isCreating.current}>Create Group</Button>
              </div>
            )}
          </div>

          <div className="groups-list">
            {groups.length === 0 ? (
              <p className="empty-message">No groups created yet</p>
            ) : (
              groups.map((group) => {
                const members = groupMembers.get(group.id) || [];
                const isEditing = editingGroupId === group.id;

                return (
                  <div key={group.id} className="group-card">
                    <div className="group-header">
                      {isEditing ? (
                        <div className="group-edit">
                          <input
                            type="text"
                            value={editingGroupName}
                            onChange={(e) => setEditingGroupName(e.target.value)}
                            onKeyPress={(e) =>
                              e.key === "Enter" && renameGroup(group.id, editingGroupName)
                            }
                            autoFocus
                          />
                          <button onClick={() => renameGroup(group.id, editingGroupName)}>
                            ✓
                          </button>
                          <button onClick={() => { setEditingGroupId(null); setEditingGroupName(""); }}>
                            ✕
                          </button>
                        </div>
                      ) : (
                        <>
                          <h4>{group.name} ({members.length})</h4>
                          {isTeacher() && (
                            <div className="group-actions">
                              <button
                                onClick={() => {
                                  setEditingGroupId(group.id);
                                  setEditingGroupName(group.name);
                                }}
                                className="edit-btn"
                              >
                                Edit
                              </button>
                              <button onClick={() => deleteGroupHandler(group.id)} className="delete-btn">
                                Delete
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="group-members">
                      {members.length === 0 ? (
                        <p className="empty-message">No members in this group</p>
                      ) : (
                        members.map((member) => (
                          <div key={member.id} className="member-card">
                            <div className="member-info">
                              <strong>{member.name}</strong>
                              <span className="member-email">{member.email}</span>
                            </div>
                            {isTeacher() && (
                              <button
                                onClick={() => removeMemberFromGroup(member.id, group.id)}
                                className="remove-btn"
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
