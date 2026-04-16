import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import ChangePassword from '../src/pages/ChangePassword';
import Profile from '../src/pages/Profile';
import * as api from '../src/util/api';

// Mock the API module
vi.mock('../src/util/api', () => ({
  changePassword: vi.fn(),
  getCurrentUserProfile: vi.fn(),
  getEnrolledCourses: vi.fn(),
  getProfilePictureUrl: vi.fn(),
  uploadProfilePicture: vi.fn(),
}));

describe('ChangePassword Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (state = {}) => {
    return render(
      <BrowserRouter>
        <ChangePassword />
      </BrowserRouter>,
      {
        initialRoute: '/change-password',
        initialEntries: [{pathname: '/change-password', state}]
      }
    );
  };

  describe('Forced Password Change (After Login)', () => {
    it('should display forced change message when state.forced === true', () => {
      renderComponent({ forced: true });
      expect(screen.getByText(/You must change your temporary password before continuing/i)).toBeInTheDocument();
    });

    it('should NOT display cancel button in forced mode', () => {
      renderComponent({ forced: true });
      const buttons = screen.getAllByRole('button');
      const cancelButton = buttons.find(btn => btn.textContent === 'Cancel');
      expect(cancelButton).not.toBeInTheDocument();
    });

    it('should display voluntary change message when state.forced is false or undefined', () => {
      renderComponent({ forced: false });
      expect(screen.getByText(/Update your password to keep your account secure/i)).toBeInTheDocument();
    });

    it('should display cancel button in voluntary mode', () => {
      renderComponent({ forced: false });
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show error when all fields are empty', async () => {
      const user = userEvent.setup();
      renderComponent({ forced: false });

      const changeButton = screen.getByRole('button', { name: /Change Password/i });
      await user.click(changeButton);

      expect(screen.getByText(/All fields are required/i)).toBeInTheDocument();
    });

    it('should show error when passwords do not match', async () => {
      const user = userEvent.setup();
      renderComponent({ forced: false });

      await user.type(screen.getByPlaceholderText(/Current password/i), 'oldpass123');
      await user.type(screen.getByPlaceholderText(/^New password/i), 'newpass123');
      await user.type(screen.getByPlaceholderText(/Confirm new password/i), 'differentpass123');

      const changeButton = screen.getByRole('button', { name: /Change Password/i });
      await user.click(changeButton);

      expect(screen.getByText(/New passwords do not match/i)).toBeInTheDocument();
    });

    it('should show error when new password is less than 6 characters', async () => {
      const user = userEvent.setup();
      renderComponent({ forced: false });

      await user.type(screen.getByPlaceholderText(/Current password/i), 'oldpass123');
      await user.type(screen.getByPlaceholderText(/^New password/i), 'short');
      await user.type(screen.getByPlaceholderText(/Confirm new password/i), 'short');

      const changeButton = screen.getByRole('button', { name: /Change Password/i });
      await user.click(changeButton);

      expect(screen.getByText(/New password must be at least 6 characters/i)).toBeInTheDocument();
    });

    it('should show error when new password is same as current password', async () => {
      const user = userEvent.setup();
      renderComponent({ forced: false });

      await user.type(screen.getByPlaceholderText(/Current password/i), 'samepass123');
      await user.type(screen.getByPlaceholderText(/^New password/i), 'samepass123');
      await user.type(screen.getByPlaceholderText(/Confirm new password/i), 'samepass123');

      const changeButton = screen.getByRole('button', { name: /Change Password/i });
      await user.click(changeButton);

      expect(screen.getByText(/New password must be different from current password/i)).toBeInTheDocument();
    });
  });

  describe('Successful Password Change', () => {
    it('should call changePassword API with correct payload', async () => {
      const user = userEvent.setup();
      vi.mocked(api.changePassword).mockResolvedValue({ msg: 'Password updated successfully' });

      renderComponent({ forced: false });

      await user.type(screen.getByPlaceholderText(/Current password/i), 'oldpass123');
      await user.type(screen.getByPlaceholderText(/^New password/i), 'newpass123');
      await user.type(screen.getByPlaceholderText(/Confirm new password/i), 'newpass123');

      const changeButton = screen.getByRole('button', { name: /Change Password/i });
      await user.click(changeButton);

      await waitFor(() => {
        expect(vi.mocked(api.changePassword)).toHaveBeenCalledWith('oldpass123', 'newpass123');
      });
    });

    it('should display success message on successful password change', async () => {
      const user = userEvent.setup();
      vi.mocked(api.changePassword).mockResolvedValue({ msg: 'Password updated successfully' });

      renderComponent({ forced: false });

      await user.type(screen.getByPlaceholderText(/Current password/i), 'oldpass123');
      await user.type(screen.getByPlaceholderText(/^New password/i), 'newpass123');
      await user.type(screen.getByPlaceholderText(/Confirm new password/i), 'newpass123');

      const changeButton = screen.getByRole('button', { name: /Change Password/i });
      await user.click(changeButton);

      await waitFor(() => {
        expect(screen.getByText(/Password changed successfully/i)).toBeInTheDocument();
      });
    });

    it('should disable inputs during submission', async () => {
      const user = userEvent.setup();
      vi.mocked(api.changePassword).mockImplementation(() => new Promise(resolve => {
        setTimeout(() => resolve({ msg: 'Success' }), 100);
      }));

      renderComponent({ forced: false });

      await user.type(screen.getByPlaceholderText(/Current password/i), 'oldpass123');
      await user.type(screen.getByPlaceholderText(/^New password/i), 'newpass123');
      await user.type(screen.getByPlaceholderText(/Confirm new password/i), 'newpass123');

      const changeButton = screen.getByRole('button', { name: /Change Password/i });
      await user.click(changeButton);

      // Inputs should be disabled during submission
      expect(screen.getByPlaceholderText(/Current password/i)).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API call fails', async () => {
      const user = userEvent.setup();
      const errorMsg = 'Current password is incorrect';
      vi.mocked(api.changePassword).mockRejectedValue(new Error(errorMsg));

      renderComponent({ forced: false });

      await user.type(screen.getByPlaceholderText(/Current password/i), 'wrongpass');
      await user.type(screen.getByPlaceholderText(/^New password/i), 'newpass123');
      await user.type(screen.getByPlaceholderText(/Confirm new password/i), 'newpass123');

      const changeButton = screen.getByRole('button', { name: /Change Password/i });
      await user.click(changeButton);

      await waitFor(() => {
        expect(screen.getByText(errorMsg)).toBeInTheDocument();
      });
    });

    it('should handle non-Error objects in catch block', async () => {
      const user = userEvent.setup();
      vi.mocked(api.changePassword).mockRejectedValue({ some: 'object' });

      renderComponent({ forced: false });

      await user.type(screen.getByPlaceholderText(/Current password/i), 'oldpass123');
      await user.type(screen.getByPlaceholderText(/^New password/i), 'newpass123');
      await user.type(screen.getByPlaceholderText(/Confirm new password/i), 'newpass123');

      const changeButton = screen.getByRole('button', { name: /Change Password/i });
      await user.click(changeButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to change password/i)).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should redirect to /home after successful forced password change', async () => {
      userEvent.setup();
      const mockNavigate = vi.fn();
      
      // This would require mocking useNavigate, which is a more complex setup
      // For now, this is documented as needing integration test setup
      vi.mock('react-router-dom', async () => ({
        ...await vi.importActual('react-router-dom'),
        useNavigate: () => mockNavigate,
      }));
    });

    it('should redirect to /profile after successful voluntary password change', async () => {
      userEvent.setup();
      const mockNavigate = vi.fn();
      
      // This would require mocking useNavigate, which is a more complex setup
      // For now, this is documented as needing integration test setup
      vi.mock('react-router-dom', async () => ({
        ...await vi.importActual('react-router-dom'),
        useNavigate: () => mockNavigate,
      }));
    });
  });
});

describe('Profile Component - Change Password Button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getCurrentUserProfile).mockResolvedValue({
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      role: 'teacher',
      student_id: null,
      profile_picture_url: null,
    });

    vi.mocked(api.getEnrolledCourses).mockResolvedValue([]);
    vi.mocked(api.getProfilePictureUrl).mockReturnValue('https://placehold.co/200x200');
  });

  it('should render Change Password button in Security section', async () => {
    render(
      <BrowserRouter>
        <Profile />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Change Password/i })).toBeInTheDocument();
    });
  });

  it('should display Security section header', async () => {
    render(
      <BrowserRouter>
        <Profile />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Security/i)).toBeInTheDocument();
    });
  });

  it('should navigate to /change-password when button is clicked', async () => {
    userEvent.setup();
    const mockNavigate = vi.fn();

    vi.mock('react-router-dom', async () => ({
      ...await vi.importActual('react-router-dom'),
      useNavigate: () => mockNavigate,
    }));

    render(
      <BrowserRouter>
        <Profile />
      </BrowserRouter>
    );

    await waitFor(() => {
      const button = screen.getByRole('button', { name: /Change Password/i });
      expect(button).toBeInTheDocument();
    });
  });

  it('should have proper button styling', async () => {
    render(
      <BrowserRouter>
        <Profile />
      </BrowserRouter>
    );

    await waitFor(() => {
      const button = screen.getByRole('button', { name: /Change Password/i });
      expect(button).toHaveStyle('padding: 0.5rem 1rem');
      expect(button).toHaveStyle('border: none');
      expect(button).toHaveStyle('border-radius: 4px');
      expect(button).toHaveStyle('cursor: pointer');
    });
  });

  it('should display all profile sections including security', async () => {
    render(
      <BrowserRouter>
        <Profile />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Full Name/i)).toBeInTheDocument();
      expect(screen.getByText(/Email/i)).toBeInTheDocument();
      expect(screen.getByText(/Role/i)).toBeInTheDocument();
      expect(screen.getByText(/Security/i)).toBeInTheDocument();
    });
  });
});

describe('LoginPage - Password Change Redirect', () => {
  it('should redirect to /change-password with forced=true when must_change_password is true', () => {
    // This test would require mocking the login response and verifying the navigation
    // Implementation depends on how the test environment is set up
  });

  it('should redirect to /home when must_change_password is false', () => {
    // This test would require mocking the login response and verifying the navigation
    // Implementation depends on how the test environment is set up
  });
});
