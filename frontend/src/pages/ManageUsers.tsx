import { useState, useEffect } from 'react';
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  changeUserPassword,
  getProfilePictureUrl,
  getCurrentUserProfile,
} from '../util/api';
import Button from '../components/Button';
import Textbox from '../components/Textbox';
import Dropdown from '../components/Dropdown';
import Pagination from '../components/Pagination';
import EditUserModal from '../components/EditUserModal';
import ChangePasswordModal from '../components/ChangePasswordModal';
import ConfirmDialog from '../components/ConfirmDialog';
import StatusMessage from '../components/StatusMessage';
import Checkbox from '../components/Checkbox';
import RosterUploadResult from '../components/RosterUploadResult';
import ErrorModal from '../components/ErrorModal';
import { importCSVAdmin } from '../util/csv';
import './ManageUsers.css';

interface RosterUploadResultData {
  message: string;
  created_count: number;
  existing_count?: number;
  new_students?: Array<{ email: string; student_id: string; temp_password: string }>;
  existing_students?: Array<{ email: string; student_id: string; name: string }>;
}

export default function ManageUsers() {
  // User data
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Filtering and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Create form
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState('student');
  const [createMustChangePassword, setCreateMustChangePassword] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);

  // Status messages
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [deleteErrorMessage, setDeleteErrorMessage] = useState('');

  // CSV upload state
  const [rosterResult, setRosterResult] = useState<RosterUploadResultData | null>(null);
  const [isUploadingCSV, setIsUploadingCSV] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, currentUserData] = await Promise.all([
        getAllUsers(),
        getCurrentUserProfile(),
      ]);
      setUsers(usersData);
      setCurrentUser(currentUserData);
    } catch (err) {
      setErrorMessage('Failed to load users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.student_id && user.student_id.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter]);

  // Clear success message after 4 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Create user
  const handleCreate = async () => {
    setErrorMessage('');

    // Validation
    if (!createName || !createEmail || !createPassword) {
      setErrorMessage('All fields are required');
      return;
    }

    if (createPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(createEmail)) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    setCreateLoading(true);
    try {
      await createUser(
        createName,
        createEmail,
        createPassword,
        createRole,
        createMustChangePassword
      );
      setSuccessMessage(`User ${createName} created successfully`);
      setShowCreateModal(false);
      resetCreateForm();
      await loadData();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setCreateLoading(false);
    }
  };

  const resetCreateForm = () => {
    setCreateName('');
    setCreateEmail('');
    setCreatePassword('');
    setCreateRole('student');
    setCreateMustChangePassword(true);
  };

  // CSV upload
  const handleCSVUpload = () => {
    if (isUploadingCSV) return;
    setIsUploadingCSV(true);
    importCSVAdmin(
      (result) => {
        setIsUploadingCSV(false);
        setRosterResult(result);
        loadData();
      },
      (error) => {
        setIsUploadingCSV(false);
        setUploadError(error instanceof Error ? error.message : String(error));
      },
      () => setIsUploadingCSV(false)
    );
  };

  // Edit user
  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleEditSave = async (userId: number, updates: Partial<User>) => {
    try {
      await updateUser(userId, updates);
      setSuccessMessage('User updated successfully');
      setShowEditModal(false);
      setSelectedUser(null);
      await loadData();
    } catch (err) {
      throw err; // Let EditUserModal handle the error
    }
  };

  // Change password
  const handleChangePasswordClick = (user: User) => {
    setSelectedUser(user);
    setShowChangePasswordModal(true);
  };

  const handleChangePasswordSave = async (userId: number, password: string) => {
    try {
      await changeUserPassword(userId, password);
      setSuccessMessage('Password changed successfully');
      setShowChangePasswordModal(false);
      setSelectedUser(null);
      await loadData();
    } catch (err) {
      throw err; // Let ChangePasswordModal handle the error
    }
  };

  // Delete user
  const handleDeleteClick = (user: User) => {
    setSelectedUser(user);
    setDeleteErrorMessage('');
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUser) return;

    try {
      await deleteUser(selectedUser.id);
      setSuccessMessage(`User ${selectedUser.name} deleted successfully`);
      setShowDeleteDialog(false);
      setSelectedUser(null);
      setDeleteErrorMessage('');
      await loadData();
    } catch (err) {
      setDeleteErrorMessage(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin':
        return 'RoleBadge-Admin';
      case 'teacher':
        return 'RoleBadge-Teacher';
      case 'student':
        return 'RoleBadge-Student';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="ManageUsers">
        <div className="ManageUsers-Loading">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="ManageUsers">
    <div className="ManageUsers-Header">
        <h1>User Management</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button onClick={handleCSVUpload} disabled={isUploadingCSV}>
            {isUploadingCSV ? 'Uploading CSV...' : 'Upload CSV'}
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>Create New User</Button>
        </div>
      </div>

      {successMessage && <StatusMessage type="success">{successMessage}</StatusMessage>}
      {errorMessage && <StatusMessage message={errorMessage} type="error" />}

      <div className="ManageUsers-Filters">
        <div className="ManageUsers-SearchBox">
          <Textbox
            placeholder="Search by name, email, or student ID..."
            value={searchTerm}
            onInput={setSearchTerm}
          />
        </div>
        <div className="ManageUsers-RoleFilter">
          <Dropdown
            value={roleFilter}
            onInput={setRoleFilter}
            options={[
              { value: 'all', label: 'All Roles' },
              { value: 'student', label: 'Student' },
              { value: 'teacher', label: 'Teacher' },
              { value: 'admin', label: 'Admin' },
            ]}
          />
        </div>
      </div>

      {paginatedUsers.length === 0 ? (
        <div className="ManageUsers-Empty">
          {filteredUsers.length === 0 ? (
            searchTerm || roleFilter !== 'all' ? (
              <p>No users found matching your filters.</p>
            ) : (
              <p>No users found.</p>
            )
          ) : null}
        </div>
      ) : (
        <>
          <div className="ManageUsers-List">
            {paginatedUsers.map((user) => (
              <div key={user.id} className="UserCard">
                <img
                  src={getProfilePictureUrl(user.profile_picture_url)}
                  alt={user.name}
                  className="UserCard-Avatar"
                />
                <div className="UserCard-Info">
                  <div className="UserCard-Name">{user.name}</div>
                  <div className="UserCard-Email">{user.email}</div>
                  {user.student_id && (
                    <div className="UserCard-StudentId">ID: {user.student_id}</div>
                  )}
                </div>
                <div className="UserCard-Role">
                  <span className={`RoleBadge ${getRoleBadgeClass(user.role)}`}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </span>
                </div>
                <div className="UserCard-Actions">
                  <Button onClick={() => handleEditClick(user)} type="secondary">
                    Edit
                  </Button>
                  <Button onClick={() => handleChangePasswordClick(user)} type="secondary">
                    Change Password
                  </Button>
                  <Button
                    onClick={() => handleDeleteClick(user)}
                    type="secondary"
                    disabled={currentUser?.id === user.id}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalItems={filteredUsers.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="Modal-Overlay" onClick={() => setShowCreateModal(false)}>
          <div className="Modal-Card" onClick={(e) => e.stopPropagation()}>
            <div className="Modal-Header">
              <h2>Create New User</h2>
              <button
                className="Modal-CloseButton"
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>

            <div className="Modal-Body">
              {errorMessage && <StatusMessage message={errorMessage} type="error" />}

              <div className="Modal-Field">
                <label>Name</label>
                <Textbox
                  placeholder="Full name..."
                  value={createName}
                  onInput={setCreateName}
                />
              </div>

              <div className="Modal-Field">
                <label>Email</label>
                <Textbox
                  type="email"
                  placeholder="user@example.com..."
                  value={createEmail}
                  onInput={setCreateEmail}
                />
              </div>

              <div className="Modal-Field">
                <label>Temporary Password</label>
                <Textbox
                  type="password"
                  placeholder="Minimum 6 characters..."
                  value={createPassword}
                  onInput={setCreatePassword}
                />
              </div>

              <div className="Modal-Field">
                <label>Role</label>
                <Dropdown
                  value={createRole}
                  onInput={setCreateRole}
                  options={[
                    { value: 'student', label: 'Student' },
                    { value: 'teacher', label: 'Teacher' },
                    { value: 'admin', label: 'Admin' },
                  ]}
                />
              </div>

              <div className="Modal-Field">
                <Checkbox
                  checked={createMustChangePassword}
                  onChange={() => setCreateMustChangePassword(!createMustChangePassword)}
                  label="Require password change on first login"
                />
              </div>
            </div>

            <div className="Modal-Actions">
              <Button
                onClick={() => setShowCreateModal(false)}
                type="secondary"
                disabled={createLoading}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createLoading}>
                {createLoading ? 'Creating...' : 'Create User'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && currentUser && (
        <EditUserModal
          user={selectedUser}
          currentUserId={currentUser.id}
          onSave={handleEditSave}
          onCancel={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
        />
      )}

      {/* Change Password Modal */}
      {showChangePasswordModal && selectedUser && (
        <ChangePasswordModal
          user={selectedUser}
          onSave={handleChangePasswordSave}
          onCancel={() => {
            setShowChangePasswordModal(false);
            setSelectedUser(null);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && selectedUser && (
        <ConfirmDialog
          title="Delete User?"
          message={`Are you sure you want to delete ${selectedUser.name}? This action cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={handleDeleteConfirm}
          onCancel={() => {
            setShowDeleteDialog(false);
            setSelectedUser(null);
            setDeleteErrorMessage('');
          }}
          error={deleteErrorMessage}
        />
      )}

      {/* CSV Upload Result Modal */}
      {rosterResult && (
        <RosterUploadResult
          enrolledCount={0}
          createdCount={rosterResult.created_count}
          existingCount={rosterResult.existing_count}
          newStudents={rosterResult.new_students}
          existingStudents={rosterResult.existing_students}
          onClose={() => setRosterResult(null)}
        />
      )}

      {/* CSV Upload Error Modal */}
      {uploadError && (
        <ErrorModal
          title="CSV Upload Error"
          message={uploadError}
          onClose={() => setUploadError(null)}
        />
      )}
    </div>
  );
}
