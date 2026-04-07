import { didExpire, removeToken } from "./login";

const BASE_URL = 'http://localhost:5000'

export const getCurrentUserProfile = async () => {
  const response = await fetch(`${BASE_URL}/user/`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include'
  });

  maybeHandleExpire(response);

  if (!response.ok) {
    throw new Error(`Response status: ${response.status}`);
  }

  return await response.json();
}

export const getUserProfileById = async (userId: number) => {
  const response = await fetch(`${BASE_URL}/user/${userId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include'
  });

  maybeHandleExpire(response);

  if (!response.ok) {
    throw new Error(`Response status: ${response.status}`);
  }

  return await response.json();
}

export const getEnrolledCourses = async () => {
  const response = await fetch(`${BASE_URL}/class/classes`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include'
  });

  maybeHandleExpire(response);

  if (!response.ok) {
    throw new Error(`Response status: ${response.status}`);
  }

  return await response.json();
}

export const updateUserProfile = async (data: { name?: string; profile_picture_url?: string }) => {
  const response = await fetch(`${BASE_URL}/user/`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
    credentials: 'include'
  });

  maybeHandleExpire(response);

  if (!response.ok) {
    throw new Error(`Response status: ${response.status}`);
  }

  return await response.json();
}

export const uploadProfilePicture = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${BASE_URL}/user/profile-picture`, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });

    maybeHandleExpire(response);

    if (!response.ok) {
      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.msg || `Response status: ${response.status}`);
      } else {
        // For non-JSON errors (like HTML error pages)
        const text = await response.text();
        console.error('Non-JSON error response:', text);
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }
    }

    return await response.json();
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

export const getProfilePictureUrl = (filename: string | null | undefined) => {
  if (!filename) {
    return 'https://placehold.co/200x200';
  }
  
  // If it's already a full URL, return it
  if (filename.startsWith('http://') || filename.startsWith('https://')) {
    return filename;
  }
  
  // Otherwise, construct the URL to our backend
  return `${BASE_URL}/user/profile-picture/${filename}`;
}




export const maybeHandleExpire = (response: Response) => {
  if (didExpire(response)) {
    removeToken();
    // Redirect to login so the user doesn't see a broken teacher UI
    // (isTeacher() reads from localStorage, which is now cleared)
    window.location.href = '/';
  }
}

export const tryLogin = async (email: string, password: string) => {
  try {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: email, password: password }),
      credentials: 'include'  // Include cookies in request/response
    });
    
    if (!response.ok) { 
      // Throw if login fails for any reason
      throw new Error(`Response status: ${response.status}`);
    }

    const json = await response.json();
    
    // Store user info (but not token - that's in httponly cookie now)
    localStorage.setItem('user', JSON.stringify(json));
    //console.log("Logged in:", json);

    return json;
  } catch (error) {
    // Login is wrong
    console.error(error);
    // window.location.href = '/';
  }

  return false
}

export const tryRegister = async (name: string, email: string, password: string) => {
  try {
    const response = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      body: JSON.stringify({
        name,
        email,
        password
      }),
      headers: {
        'Content-Type': 'application/json'
      },
    });
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(error);
  }
}

export const createClass = async (name: string) => {
  const response = await fetch(`${BASE_URL}/class/create_class`, {
    method: 'POST',
    body: JSON.stringify({
      name,
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include'  // Include cookies (JWT token)
  })

  maybeHandleExpire(response);

  if (!response.ok) {
    throw new Error(`Response status: ${response.status}`);
  }
  return response
}

export const listClasses = async () => {
  // TODO get session info and whatnot
  const resp = await fetch(`${BASE_URL}/class/classes`, {
    method: 'GET',
    credentials: 'include'  // Include cookies (JWT token)
  })

  maybeHandleExpire(resp);

  if (!resp.ok) {
    throw new Error(`Response status: ${resp.status}`);
  }

  return await resp.json()
}

export const importStudentsForCourse = async (courseID: number, students: string) => {
  const response = await fetch(`${BASE_URL}/class/enroll_students`, {
    method: 'POST',
    body: JSON.stringify({
      students,
      class_id: courseID,
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include'
  })

  maybeHandleExpire(response);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.msg || `Error: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }

  return await response.json();
}

export const getClassDetails = async (classId: number) => {
  const response = await fetch(`${BASE_URL}/class/${classId}`, {
    method: 'GET',
    credentials: 'include'
  });

  maybeHandleExpire(response);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.msg || `Error: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }

  return await response.json();
}

export const updateClass = async (classId: number, name: string) => {
  const response = await fetch(`${BASE_URL}/class/update_class`, {
    method: 'PUT',
    body: JSON.stringify({
      id: classId,
      name,
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include'
  });

  maybeHandleExpire(response);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.msg || `Error: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }

  return await response.json();
}

export const deleteClass = async (classId: number) => {
  const response = await fetch(`${BASE_URL}/class/delete_class`, {
    method: 'DELETE',
    body: JSON.stringify({
      id: classId,
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include'
  });

  maybeHandleExpire(response);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.msg || `Error: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }

  return await response.json();
}

export const archiveClass = async (classId: number) => {
  const response = await fetch(`${BASE_URL}/class/archive_class`, {
    method: 'PUT',
    body: JSON.stringify({ id: classId }),
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include'
  });

  maybeHandleExpire(response);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.msg || `Error: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }

  return await response.json();
}

export const getArchivedClasses = async () => {
  const response = await fetch(`${BASE_URL}/class/archived_classes`, {
    method: 'GET',
    credentials: 'include'
  });

  maybeHandleExpire(response);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.msg || `Error: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }

  return await response.json();
}

export const unarchiveClass = async (classId: number) => {
  const response = await fetch(`${BASE_URL}/class/unarchive_class`, {
    method: 'PUT',
    body: JSON.stringify({ id: classId }),
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include'
  });

  maybeHandleExpire(response);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.msg || `Error: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }

  return await response.json();
}

export const hideClass = async (classId: number) => {
  const response = await fetch(`${BASE_URL}/class/hide_class`, {
    method: 'PUT',
    body: JSON.stringify({ id: classId }),
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include'
  });

  maybeHandleExpire(response);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.msg || `Error: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }

  return await response.json();
}

export const unhideClass = async (classId: number) => {
  const response = await fetch(`${BASE_URL}/class/unhide_class`, {
    method: 'PUT',
    body: JSON.stringify({ id: classId }),
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include'
  });

  maybeHandleExpire(response);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.msg || `Error: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }

  return await response.json();
}

export const getHiddenClasses = async () => {
  const response = await fetch(`${BASE_URL}/class/hidden_classes`, {
    method: 'GET',
    credentials: 'include'
  });

  maybeHandleExpire(response);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.msg || `Error: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }

  return await response.json();
}

export interface GradebookAssignmentEntry {
  assignment_id: number;
  assignment_name: string;
  due_date: string | null;
  submission_status: 'submitted' | 'submitted late' | 'no submission';
  submission: {
    id: number;
    filename: string;
    submitted_at: string;
  } | null;
  peer_evaluation: {
    completed: number;
    expected: number;
    ratio: number;
    status: 'complete' | 'incomplete' | 'not required';
  };
  computed_grade: number | null;
  penalty_applied_percent: number;
  effective_grade: number | null;
  override_grade: number | null;
  override_reason: string | null;
  grade_source: 'override' | 'computed' | 'pending';
}

export interface GradebookStudentRow {
  student_id: number;
  student_name: string;
  student_number: string | null;
  email: string;
  course_total?: {
    computed: number | null;
    effective: number | null;
    override: number | null;
    reason: string | null;
    source: 'override' | 'computed' | 'pending';
  };
  course_total_grade: number | null;
  assignments: GradebookAssignmentEntry[];
}

export interface GradebookAggregate {
  assignment_id: number;
  assignment_name: string;
  due_date: string | null;
  submitted_count: number;
  late_count: number;
  missing_count: number;
  average_grade: number | null;
}

export interface GradebookData {
  class: {
    id: number;
    name: string;
  };
  policy: {
    late_penalty_percent: number;
    incomplete_evaluation_penalty_percent: number;
  };
  assignment_aggregates: GradebookAggregate[];
  students: GradebookStudentRow[];
  generated_at: string;
}

export interface StudentGradebookDetail {
  class: {
    id: number;
    name: string;
  };
  student: {
    id: number;
    name: string;
    email: string;
    student_number: string | null;
  };
  course_total?: {
    computed: number | null;
    effective: number | null;
    override: number | null;
    reason: string | null;
    source: 'override' | 'computed' | 'pending';
  };
  course_total_grade: number | null;
  assignments: Array<
    GradebookAssignmentEntry & {
      all_submissions: Array<{
        id: number;
        filename: string;
        submitted_at: string;
      }>;
      received_reviews: Array<{
        review_id: number;
        review_type: string;
        reviewer_id: number;
        reviewer_name: string;
        is_complete: boolean;
        grade: number | null;
      }>;
    }
  >;
}

export interface MyCourseGradeData {
  class: {
    id: number;
    name: string;
  };
  student: {
    id: number;
    name: string;
  };
  course_total?: {
    computed: number | null;
    effective: number | null;
    override: number | null;
    reason: string | null;
    source: 'override' | 'computed' | 'pending';
  };
  course_total_grade: number | null;
  status: string;
  assignments: GradebookAssignmentEntry[];
}

export const getClassGradebook = async (classId: number): Promise<GradebookData> => {
  const response = await fetch(`${BASE_URL}/class/${classId}/gradebook`, {
    method: 'GET',
    credentials: 'include'
  });

  maybeHandleExpire(response);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.msg || `Error: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }

  return await response.json();
}

export const getStudentGradebookDetail = async (
  classId: number,
  studentId: number
): Promise<StudentGradebookDetail> => {
  const response = await fetch(`${BASE_URL}/class/${classId}/gradebook/student/${studentId}`, {
    method: 'GET',
    credentials: 'include'
  });

  maybeHandleExpire(response);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.msg || `Error: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }

  return await response.json();
}

export const updateClassGradePolicy = async (
  classId: number,
  data: {
    late_penalty_percent?: number;
    incomplete_evaluation_penalty_percent?: number;
  }
) => {
  const response = await fetch(`${BASE_URL}/class/${classId}/gradebook/policy`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
    credentials: 'include'
  });

  maybeHandleExpire(response);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.msg || `Error: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }

  return await response.json();
}

export const updateGradeOverride = async (
  classId: number,
  data: {
    assignment_id: number;
    student_id: number;
    override_grade?: number | null;
    reason?: string;
  }
) => {
  const response = await fetch(`${BASE_URL}/class/${classId}/gradebook/overrides`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
    credentials: 'include'
  });

  maybeHandleExpire(response);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.msg || `Error: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }

  return await response.json();
}

export const updateCourseTotalOverride = async (
  classId: number,
  data: {
    student_id: number;
    override_total?: number | null;
    reason?: string;
  }
) => {
  const response = await fetch(`${BASE_URL}/class/${classId}/gradebook/course-total-overrides`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
    credentials: 'include'
  });

  maybeHandleExpire(response);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.msg || `Error: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }

  return await response.json();
}

export const getMyCourseGrade = async (
  classId: number,
  studentId?: number
): Promise<MyCourseGradeData> => {
  const query = studentId ? `?student_id=${studentId}` : '';
  const response = await fetch(`${BASE_URL}/class/${classId}/my-grade${query}`, {
    method: 'GET',
    credentials: 'include'
  });

  maybeHandleExpire(response);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.msg || `Error: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }

  return await response.json();
}

export interface AssignmentGradebookData {
  class: {
    id: number;
    name: string;
  };
  assignment: {
    id: number;
    name: string;
    due_date: string | null;
  };
  policy: {
    late_penalty_percent: number;
    incomplete_evaluation_penalty_percent: number;
  };
  aggregate: {
    submitted_count: number;
    late_count: number;
    missing_count: number;
    average_grade: number | null;
  };
  students: Array<{
    student_id: number;
    student_name: string;
    student_number: string | null;
    email: string;
    entry: GradebookAssignmentEntry;
  }>;
}

export const getAssignmentGradebook = async (
  assignmentId: number
): Promise<AssignmentGradebookData> => {
  const response = await fetch(`${BASE_URL}/assignment/${assignmentId}/gradebook`, {
    method: 'GET',
    credentials: 'include'
  });

  maybeHandleExpire(response);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.msg || `Error: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }

  return await response.json();
}

export const listAssignments = async (classId: string) => {
  const resp = await fetch(`${BASE_URL}/assignment/`+classId, {
    method: 'GET',
    headers: {
       'Content-Type': 'application/json',
    },
    credentials: 'include',
  })
  
  maybeHandleExpire(resp);

  if (!resp.ok) {
    throw new Error(`Response status: ${resp.status}`);
  }

  return await resp.json()
}

// Alias for listAssignments with number parameter
export const getAssignmentsByClass = async (classId: number) => {
  return listAssignments(String(classId));
}


export const listStuGroup = async (assignmentId : number, studentId : number) => {
  const resp = await fetch(`${BASE_URL}/list_stu_groups/`+ assignmentId + "/" + studentId, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
   },
    credentials: 'include',
  })

  maybeHandleExpire(resp);


  if (!resp.ok) {
    throw new Error(`Response status: ${resp.status}`);
  }

  return await resp.json()
} 

export const listGroups = async (assignmentId : number) => {
  const resp = await fetch(`${BASE_URL}/list_all_groups/` + assignmentId, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
   },
    credentials: 'include',
  })
  maybeHandleExpire(resp);


  if (!resp.ok) {
    throw new Error(`Response status: ${resp.status}`);
  }
  
  return await resp.json()
} 

export const listUnassignedGroups = async (assignmentId : number) => {
  const resp = await fetch(`${BASE_URL}/list_ua_groups/` + assignmentId, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
   },
    credentials: 'include',
  })

  maybeHandleExpire(resp);

  return await resp.json()
}

export const listCourseMembers = async (classId: string) => {
  const resp = await fetch(`${BASE_URL}/class/members`, {
    method: 'POST',
    body: JSON.stringify({
      id: classId,
    }),
    headers: {
       'Content-Type': 'application/json',
    },
    credentials: 'include',
  })
  
  maybeHandleExpire(resp);

  if (!resp.ok) {
    throw new Error(`Response status: ${resp.status}`);
  }
  
  return await resp.json()
} 

export const getCourseGroups = async (courseId: number) => {
  const resp = await fetch(`${BASE_URL}/classes/${courseId}/groups`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  })
  
  maybeHandleExpire(resp);

  if (!resp.ok) {
    throw new Error(`Response status: ${resp.status}`);
  }
  
  return await resp.json()
}

export const getGroupMembers = async (courseId: number, groupId: number) => {
  const resp = await fetch(`${BASE_URL}/classes/${courseId}/groups/${groupId}/members`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  })

  maybeHandleExpire(resp);

  if (!resp.ok) {
    throw new Error(`Response status: ${resp.status}`);
  }

  return await resp.json()
}

export const getMyGroup = async (courseId: number): Promise<{ groupId: number | null; groupName: string | null }> => {
  const resp = await fetch(`${BASE_URL}/classes/${courseId}/my-group`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  })

  maybeHandleExpire(resp);

  if (!resp.ok) {
    throw new Error(`Response status: ${resp.status}`);
  }

  return await resp.json()
} 




export const listGroupMembers = async (assignmentId : number, groupID: number) => {
  const resp = await fetch(`${BASE_URL}/list_group_members/` + assignmentId + '/' + groupID, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
   },
    credentials: 'include',
  })

  maybeHandleExpire(resp);

  if (!resp.ok) {
    throw new Error(`Response status: ${resp.status}`);
  }
  
  return await resp.json()
} 

export const getUserId = async () => {
  const resp = await fetch(`${BASE_URL}/user_id`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
   },
    credentials: 'include',
  })

  maybeHandleExpire(resp);

  if (!resp.ok) {
    throw new Error(`Response status: ${resp.status}`);
  }
  
  return await resp.json()
} 

export const saveGroups = async (groupID: number, userID: number, assignmentID : number) =>{
  await fetch(`${BASE_URL}/save_groups`, {
    method: 'POST',
    body: JSON.stringify({
      groupID,
      userID,
      assignmentID
    }),
    headers: {
      'Content-Type': 'application/json',
   },
    credentials: 'include',
  })
}

export const getCriteria = async (rubricID: number) => {
  const resp = await fetch(`${BASE_URL}/criteria?rubricID=${rubricID}`, {
    credentials: 'include'
  })

  maybeHandleExpire(resp);

  if (!resp.ok) {
    throw new Error(`Response status: ${resp.status}`);
  }

  return await resp.json()
}

export const createCriteria = async (rubricID: number, question: string, scoreMax: number, canComment: boolean, hasScore: boolean = true, description: string = '', criteriaType: string = 'both') => {
  const response = await fetch(`${BASE_URL}/create_criteria`, {
    method: 'POST',
    body: JSON.stringify({
      rubricID, question, scoreMax, canComment, hasScore, description, criteria_type: criteriaType
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include'
  })

  maybeHandleExpire(response);

  if (!response.ok) {
    throw new Error(`Response status: ${response.status}`);
  }
}

export const deleteCriteria = async (criteriaId: number) => {
  const response = await fetch(`${BASE_URL}/delete_criteria/${criteriaId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include'
  })

  maybeHandleExpire(response);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.msg || `Response status: ${response.status}`);
  }
  
  return await response.json();
}

export const createRubric = async (id: number, assignmentID: number, canComment: boolean): Promise<{ id: number }> => {
  const response = await fetch(`${BASE_URL}/create_rubric`, {
    method: 'POST',
    body: JSON.stringify({
      id, assignmentID, canComment
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include'
  })

  maybeHandleExpire(response);

  if (!response.ok) {
    throw new Error(`Response status: ${response.status}`);
  }

  return await response.json();
}

export const getRubric = async (rubricIDOrAssignmentID: number, useAsAssignmentID: boolean = false) => {
  const queryParam = useAsAssignmentID ? `assignmentID=${rubricIDOrAssignmentID}` : `rubricID=${rubricIDOrAssignmentID}`;
  const resp = await fetch(`${BASE_URL}/rubric?${queryParam}`, {
      credentials: 'include'
  });

  maybeHandleExpire(resp);

  if (!resp.ok) {
      throw new Error(`Response status: ${resp.status}`);
  }

  return await resp.json();
}


export const createAssignment = async (
  courseID: number,
  name: string,
  submissionType: 'individual' | 'group' = 'individual',
  internalReview: boolean = false,
  externalReview: boolean = false,
  anonymousReview: boolean = false,
  startDate?: string,
  dueDate?: string,
  description?: string,
  peerReviewStartDate?: string,
  peerReviewDueDate?: string
)=> {
  const response = await fetch(`${BASE_URL}/assignment/create_assignment`, {
    method: 'POST',
    body: JSON.stringify({
      courseID,
      name,
      submission_type: submissionType,
      internal_review: internalReview,
      external_review: externalReview,
      anonymous_review: anonymousReview,
      ...(startDate && { start_date: startDate }),
      ...(dueDate && { due_date: dueDate }),
      ...(description && { description: description }),
      ...(peerReviewStartDate && { peer_review_start_date: peerReviewStartDate }),
      ...(peerReviewDueDate && { peer_review_due_date: peerReviewDueDate })
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include'
  })

  maybeHandleExpire(response);

  if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.msg || `Response status: ${response.status}`;
      throw new Error(errorMessage);
  }

  return await response.json();
}

export const getAssignmentDetails = async (assignmentId: number) => {
  const response = await fetch(`${BASE_URL}/assignment/details/${assignmentId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include'
  });

  maybeHandleExpire(response);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.msg || `Response status: ${response.status}`);
  }

  return await response.json();
}

export const editAssignment = async (assignmentId: number, data: {
  name?: string,
  description?: string,
  rubric?: string,
  start_date?: string,
  due_date?: string,
  peer_review_start_date?: string,
  peer_review_due_date?: string,
  submission_type?: string,
  internal_review?: boolean,
  external_review?: boolean,
  anonymous_review?: boolean
}) => {
  const response = await fetch(`${BASE_URL}/assignment/edit_assignment/${assignmentId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include'
  });

  maybeHandleExpire(response);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.msg || `Response status: ${response.status}`);
  }

  return await response.json();
}

export const deleteAssignment = async (assignmentId: number) => {
  const response = await fetch(`${BASE_URL}/assignment/delete_assignment/${assignmentId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include'
  });

  maybeHandleExpire(response);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.msg || `Response status: ${response.status}`);
  }

  return await response.json();
}

export const deleteGroup = async (groupID: number) => {
  await fetch(`${BASE_URL}/delete_group`, {
    method: 'POST',
    body: JSON.stringify({
      groupID,
    }),
    headers: {
      'Content-Type': 'application/json',
   },
    credentials: 'include',
  })
}

export const createReview = async (assignmentID: number, reviewerID: number, revieweeID: number, reviewerType: string = 'user', revieweeType: string = 'user') => {
  const response = await fetch(`${BASE_URL}/create_review`, {
    method: 'POST',
    body: JSON.stringify({
      assignmentID,
      reviewerID,
      revieweeID,
      reviewerType,
      revieweeType,
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include'
  })

  maybeHandleExpire(response);

  if (!response.ok) {
    throw new Error(`Response status: ${response.status}`);
  }
  return response
}

export const createCriterion = async (reviewID: number, criterionRowID: number, grade: number, comments: string) => {
  const response = await fetch(`${BASE_URL}/create_criterion`, {
    method: 'POST',
    body: JSON.stringify({
      reviewID,
      criterionRowID,
      grade,
      comments,
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include'
  })

  maybeHandleExpire(response);

  if (!response.ok) {
    throw new Error(`Response status: ${response.status}`);
  }
  return response
}

export const getReview = async (assignmentID: number, reviewerID: number, revieweeID: number, reviewerType: string = 'user', revieweeType: string = 'user') => {
  const resp = await fetch(`${BASE_URL}/review?assignmentID=${assignmentID}&reviewerID=${reviewerID}&revieweeID=${revieweeID}&reviewerType=${reviewerType}&revieweeType=${revieweeType}`, {
    credentials: 'include'
  })

  maybeHandleExpire(resp);

  if (!resp.ok) {
    throw new Error(`Response status: ${resp.status}`);
  }

  return resp
}

export interface SubmittedReviewData {
  reviewId: number;
  revieweeId: number;
  revieweeName: string;
  type: 'internal' | 'external';
  grade: number | null;
}

export interface ReceivedReviewData {
  reviewerId: number;
  reviewerName: string;
  type: 'internal' | 'external';
  grade: number | null;
}

export const getSubmittedReviews = async (assignmentID: number): Promise<SubmittedReviewData[]> => {
  const resp = await fetch(`${BASE_URL}/reviews/submitted?assignmentID=${assignmentID}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include'
  })

  maybeHandleExpire(resp);

  if (!resp.ok) {
    throw new Error(`Response status: ${resp.status}`);
  }

  return await resp.json()
}

export const getReceivedReviews = async (assignmentID: number): Promise<ReceivedReviewData[]> => {
  const resp = await fetch(`${BASE_URL}/reviews/received?assignmentID=${assignmentID}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include'
  })

  maybeHandleExpire(resp);

  if (!resp.ok) {
    throw new Error(`Response status: ${resp.status}`);
  }

  return await resp.json()
}

export interface StudentReviewSummary {
  student: { id: number; name: string };
  reviews_given: Array<{ reviewee_name: string; grade: number | null; type: string }>;
  reviews_received: Array<{ reviewer_name: string; grade: number | null; type: string }>;
  avg_given: number | null;
  avg_received: number | null;
}

export const getStudentReviewSummary = async (
  assignmentId: number,
  studentId: number
): Promise<StudentReviewSummary> => {
  const resp = await fetch(
    `${BASE_URL}/assignment/${assignmentId}/student/${studentId}/review-summary`,
    { method: 'GET', credentials: 'include' }
  );
  maybeHandleExpire(resp);
  if (!resp.ok) {
    throw new Error(`Response status: ${resp.status}`);
  }
  return await resp.json();
};

export const getNextGroupID = async(assignmentID: number)=> {
  const response = await fetch(`${BASE_URL}/next_groupid?assignmentID=${assignmentID}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include'
  })

  maybeHandleExpire(response);

  if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
  }

  return await response.json();
}

export const createGroup = async(assignmentID: number, name: string, id: number) =>{
  const response = await fetch(`${BASE_URL}/create_group`,{
    method:"POST",
    body: JSON.stringify({
      assignmentID, name, id
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include'
  })
  maybeHandleExpire(response);

  if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
  }

  return await response.json();
}

// Admin - Create Teacher Account
export const createTeacherAccount = async (name: string, email: string, password: string) => {
  const response = await fetch(`${BASE_URL}/admin/users/create`, {
    method: 'POST',
    body: JSON.stringify({ 
      name, 
      email, 
      password,
      role: 'teacher',
      must_change_password: true
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include'
  });

  maybeHandleExpire(response);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.msg || `Response status: ${response.status}`);
  }

  return await response.json();
}

// User - Change Password
export const changePassword = async (currentPassword: string, newPassword: string) => {
  const response = await fetch(`${BASE_URL}/user/password`, {
    method: 'PATCH',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include'
  });

  maybeHandleExpire(response);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.msg || `Response status: ${response.status}`);
  }

  return await response.json();
}

// Assignment File Upload
export const uploadAssignmentFile = async (assignmentId: number, file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${BASE_URL}/assignment/upload_file/${assignmentId}`, {
    method: 'POST',
    body: formData,
    credentials: 'include'
  });

  maybeHandleExpire(response);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.msg || `Response status: ${response.status}`);
  }

  return await response.json();
};

// Get all files for an assignment
export const getAssignmentFiles = async (assignmentId: number) => {
  const response = await fetch(`${BASE_URL}/assignment/files/${assignmentId}`, {
    method: 'GET',
    credentials: 'include'
  });

  maybeHandleExpire(response);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.msg || `Response status: ${response.status}`);
  }

  return await response.json();
};

// Assignment File Download
export const downloadAssignmentFile = async (fileId: number) => {
  const response = await fetch(`${BASE_URL}/assignment/download_file/${fileId}`, {
    method: 'GET',
    credentials: 'include'
  });

  maybeHandleExpire(response);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.msg || `Response status: ${response.status}`);
  }

  // Return the blob for download
  return response.blob();
};

// Assignment File Delete
export const deleteAssignmentFile = async (fileId: number) => {
  const response = await fetch(`${BASE_URL}/assignment/delete_file/${fileId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include'
  });

  maybeHandleExpire(response);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.msg || `Response status: ${response.status}`);
  }

  return await response.json();
};

// ================================
// STUDENT SUBMISSION API FUNCTIONS
// ================================

// Upload a student submission file or text
export const uploadStudentSubmission = async (
  assignmentId: number,
  options: { file?: File; text?: string }
) => {
  const formData = new FormData();

  if (options.file) {
    formData.append('file', options.file);
  }
  if (options.text) {
    formData.append('submissionText', options.text);
  }

  const response = await fetch(`${BASE_URL}/submissions/upload/${assignmentId}`, {
    method: 'POST',
    body: formData,
    credentials: 'include'
  });

  maybeHandleExpire(response);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.msg || `Response status: ${response.status}`);
  }

  return await response.json();
};

// Get student submissions for an assignment
export const getStudentSubmissions = async (assignmentId: number) => {
  const response = await fetch(`${BASE_URL}/submissions/assignment/${assignmentId}`, {
    method: 'GET',
    credentials: 'include'
  });

  maybeHandleExpire(response);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.msg || `Response status: ${response.status}`);
  }

  const data = await response.json();
  return data.submissions || [];
};

// Get submissions for a specific target (student or group) within an assignment for peer review
export const getPeerReviewSubmissions = async (assignmentId: number, targetId: number, targetType: 'user' | 'group' = 'user') => {
  const response = await fetch(`${BASE_URL}/submissions/peer-review/${assignmentId}/${targetId}?type=${targetType}`, {
    method: 'GET',
    credentials: 'include'
  });

  maybeHandleExpire(response);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.msg || `Response status: ${response.status}`);
  }

  const data = await response.json();
  return data.submissions || [];
};

export interface ReviewTarget {
  id: number;
  name: string;
  has_submitted: boolean;
  is_late: boolean;
}

export interface ReviewTargetsResponse {
  reviewer_eligible: boolean;
  internal_targets: ReviewTarget[];
  external_targets: ReviewTarget[];
}

export const getReviewTargets = async (assignmentId: number): Promise<ReviewTargetsResponse> => {
  const response = await fetch(`${BASE_URL}/review-targets/${assignmentId}`, {
    method: 'GET',
    credentials: 'include'
  });

  maybeHandleExpire(response);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.msg || `Response status: ${response.status}`);
  }

  return response.json();
};

// Download a student submission file
export const downloadStudentSubmission = async (submissionId: number) => {
  const response = await fetch(`${BASE_URL}/submissions/download/${submissionId}`, {
    method: 'GET',
    credentials: 'include'
  });

  maybeHandleExpire(response);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.msg || `Response status: ${response.status}`);
  }

  // Return the blob for download
  return response.blob();
};

// Edit a student submission (update text and/or replace file)
export const editStudentSubmission = async (
  submissionId: number,
  options: { text?: string; file?: File; removeFile?: boolean }
) => {
  const formData = new FormData();

  if (options.text !== undefined) {
    formData.append('submissionText', options.text);
  }
  if (options.file) {
    formData.append('file', options.file);
  }
  if (options.removeFile) {
    formData.append('removeFile', 'true');
  }

  const response = await fetch(`${BASE_URL}/submissions/${submissionId}`, {
    method: 'PUT',
    body: formData,
    credentials: 'include'
  });

  maybeHandleExpire(response);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.msg || `Response status: ${response.status}`);
  }

  return await response.json();
};

// Delete a student submission
export const deleteStudentSubmission = async (submissionId: number) => {
  const response = await fetch(`${BASE_URL}/submissions/${submissionId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include'
  });

  maybeHandleExpire(response);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.msg || `Response status: ${response.status}`);
  }

  return await response.json();
};

// Browse all courses (for students to browse and enroll)
export const browseAllClasses = async () => {
  const response = await fetch(`${BASE_URL}/class/browse_classes`, {
    method: 'GET',
    credentials: 'include'
  })

  maybeHandleExpire(response);

  if (!response.ok) {
    throw new Error(`Response status: ${response.status}`);
  }

  return await response.json();
}

// Request to enroll in a course (for students)
// Creates an enrollment request that must be approved by the teacher
export const requestEnrollment = async (courseId: number) => {
  const response = await fetch(`${BASE_URL}/enrollments/request`, {
    method: 'POST',
    body: JSON.stringify({
      course_id: courseId
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include'
  })

  maybeHandleExpire(response);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.msg || `Response status: ${response.status}`;
    throw new Error(errorMessage);
  }

  return await response.json();
}

// Keep enrollInCourse for backward compatibility (now calls requestEnrollment)
export const enrollInCourse = async (courseId: number) => {
  return requestEnrollment(courseId);
}

// Get pending enrollment requests for a teacher
export const getEnrollmentRequests = async () => {
  const response = await fetch(`${BASE_URL}/enrollments/teacher/requests`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include'
  })

  maybeHandleExpire(response);

  if (!response.ok) {
    throw new Error(`Response status: ${response.status}`);
  }

  return await response.json();
}

// Approve an enrollment request
export const approveEnrollmentRequest = async (requestId: number) => {
  const response = await fetch(`${BASE_URL}/enrollments/${requestId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include'
  })

  maybeHandleExpire(response);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.msg || `Response status: ${response.status}`;
    throw new Error(errorMessage);
  }

  return await response.json();
}

// Reject an enrollment request
export const rejectEnrollmentRequest = async (requestId: number, notes?: string) => {
  const response = await fetch(`${BASE_URL}/enrollments/${requestId}/reject`, {
    method: 'POST',
    body: JSON.stringify({
      notes: notes || ''
    }),
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include'
  })

  maybeHandleExpire(response);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.msg || `Response status: ${response.status}`;
    throw new Error(errorMessage);
  }

  return await response.json();
}

// Get all notifications for the current user
export const getNotifications = async () => {
  const response = await fetch(`${BASE_URL}/notifications`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include'
  })

  maybeHandleExpire(response);

  if (!response.ok) {
    throw new Error(`Response status: ${response.status}`);
  }

  return await response.json();
}

// Get unread notifications for the current user
export const getUnreadNotifications = async () => {
  const response = await fetch(`${BASE_URL}/notifications/unread`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include'
  })

  maybeHandleExpire(response);

  if (!response.ok) {
    throw new Error(`Response status: ${response.status}`);
  }

  return await response.json();
}

// Mark a notification as read
export const markNotificationAsRead = async (notificationId: number) => {
  const response = await fetch(`${BASE_URL}/notifications/${notificationId}/read`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include'
  })

  maybeHandleExpire(response);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.msg || `Response status: ${response.status}`;
    throw new Error(errorMessage);
  }

  return await response.json();
}

// Get all registered students NOT enrolled in a specific course (for direct-add)
export const getRegisteredStudentsForCourse = async (courseId: string | number, search?: string) => {
  const params = search ? `?search=${encodeURIComponent(search)}` : ''
  const response = await fetch(`${BASE_URL}/class/${courseId}/registered_students${params}`, {
    method: 'GET',
    credentials: 'include',
  })

  maybeHandleExpire(response);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.msg || `Response status: ${response.status}`);
  }

  return await response.json();
}

// Directly enroll one or more registered students into a course by user ID
export const enrollDirectStudents = async (courseId: string | number, studentIds: number[]) => {
  const response = await fetch(`${BASE_URL}/class/${courseId}/enroll_direct`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ student_ids: studentIds }),
    credentials: 'include',
  })

  maybeHandleExpire(response);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.msg || `Response status: ${response.status}`);
  }

  return await response.json();
}

// Remove (unenroll) a student from a course
export const unenrollStudent = async (courseId: string | number, studentId: number) => {
  const response = await fetch(`${BASE_URL}/class/${courseId}/members/${studentId}`, {
    method: 'DELETE',
    credentials: 'include',
  })

  maybeHandleExpire(response);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.msg || `Response status: ${response.status}`);
  }

  return await response.json();
}

// Get pending enrollment requests for a specific course
export const getCourseEnrollmentRequests = async (courseId: string | number) => {
  const response = await fetch(`${BASE_URL}/enrollments/course/${courseId}/requests`, {
    method: 'GET',
    credentials: 'include',
  })

  maybeHandleExpire(response);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.msg || `Response status: ${response.status}`);
  }

  return await response.json();
}