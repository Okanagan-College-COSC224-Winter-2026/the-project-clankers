const BASE_URL = 'http://localhost:5000';
// Token is now stored in httponly cookie, so we don't need getToken anymore
// But we keep user info (role, name, user_id) in localStorage for UI purposes
export const getToken = () => {
  // Tokens are now in httponly cookies, no longer accessible from JS
  return null;
}

export const removeToken = () => {
  localStorage.removeItem("user");
}

export const didExpire = (response: Response) => {
  // Response would be 401 if the token expired (or is otherwise invalid)
  return response.status === 401;
}

export const getUserRole = (): string => {
  const user = JSON.parse(localStorage.getItem("user") || '{ "role": "student" }');
  return user.role || "student";
}

export const isTeacher = () => {
  return getUserRole() === "teacher";
}

export const isAdmin = () => {
  return getUserRole() === "admin";
}

export const isStudent = () => {
  return getUserRole() === "student";
}

export const hasRole = (...roles: string[]) => {
  const userRole = getUserRole();
  return roles.includes(userRole);
}

export const logout = async () => {
  // Call backend logout endpoint to clear the cookie
  try {
    await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include'  // Include cookies in request
    });
  } catch (error) {
    console.error('Logout error:', error);
  }
  
  // Remove user info from local storage
  removeToken();

  window.location.href = '/';
}