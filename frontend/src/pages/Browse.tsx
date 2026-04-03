import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import ClassCard from "../components/ClassCard";
import { browseAllClasses, listAssignments, requestEnrollment, listClasses } from "../util/api";
import { isStudent } from "../util/login";

interface Course {
  id: number;
  name: string;
}

interface CourseWithAssignments extends Course {
  assignments: unknown[];
  assignmentCount: number;
}

export default function Browse() {
  const [courses, setCourses] = useState<CourseWithAssignments[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrollingCourseId, setEnrollingCourseId] = useState<number | null>(null);
  const [enrollMsg, setEnrollMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    ;(async () => {
      try {
        const coursesResp = await browseAllClasses();

        let enrolledIds = new Set<number>();
        if (isStudent()) {
          const enrolledCourses = await listClasses();
          enrolledIds = new Set(enrolledCourses.map((c: Course) => c.id));
        }
        setEnrolledCourseIds(enrolledIds);

        const coursesWithAssignments = await Promise.all(
          coursesResp.map(async (course: Course) => {
            try {
              const assignments = await listAssignments(String(course.id));
              return { ...course, assignments: assignments || [], assignmentCount: assignments?.length || 0 };
            } catch {
              return { ...course, assignments: [], assignmentCount: 0 };
            }
          })
        );

        setCourses(coursesWithAssignments);
      } catch {
        setError("Failed to load courses. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleEnroll = async (courseId: number) => {
    try {
      setEnrollingCourseId(courseId);
      await requestEnrollment(courseId);
      setEnrolledCourseIds(prev => new Set([...prev, courseId]));
      setEnrollMsg({ type: 'success', text: 'Enrollment request submitted! Waiting for teacher approval.' });
      setTimeout(() => setEnrollMsg(null), 5000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to request enrollment in course.";
      setEnrollMsg({ type: 'error', text: errorMessage });
    } finally {
      setEnrollingCourseId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading courses...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col p-6">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex h-16 flex-col justify-center border-b bg-background px-6">
        <h2 className="text-xl font-semibold leading-tight">Browse Courses</h2>
        <span className="text-xs text-muted-foreground leading-tight">Browse all available courses and request to join</span>
      </div>

      <div className="flex-1 p-6">
        {enrollMsg && (
          <div
            className={`mb-4 rounded-md border px-4 py-2 text-sm ${
              enrollMsg.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {enrollMsg.text}
          </div>
        )}

        {courses.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <h2 className="mb-2 text-lg font-semibold">No courses available</h2>
              <p className="text-muted-foreground">There are no courses in the system yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {courses.map((course) => {
              const isEnrolled = enrolledCourseIds.has(course.id);
              const isEnrolling = enrollingCourseId === course.id;
              return (
                <ClassCard
                  key={course.id}
                  image="https://crc.losrios.edu//shared/img/social-1200-630/programs/general-science-social.jpg"
                  name={course.name}
                  subtitle={`${course.assignmentCount || 0} assignments`}
                  onclick={isEnrolled ? () => { window.location.href = `/classes/${course.id}/home`; } : undefined}
                  action={
                    isStudent() ? (
                      <button
                        onClick={() => handleEnroll(course.id)}
                        disabled={isEnrolled || isEnrolling}
                        className={`w-full rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                          isEnrolled
                            ? 'border-green-200 bg-green-50 text-green-700 cursor-default'
                            : 'border-primary text-primary hover:bg-accent disabled:opacity-50'
                        }`}
                      >
                        {isEnrolling ? 'Requesting…' : isEnrolled ? 'Enrolled' : 'Request to Join'}
                      </button>
                    ) : null
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
