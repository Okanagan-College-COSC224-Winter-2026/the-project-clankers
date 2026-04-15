import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseUTC } from "../util/dates";
import {
  Loader2,
  GraduationCap,
  Download,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  BookOpen,
  User,
  Search,
} from "lucide-react";
import { listClasses, getMyCourseGrade, getCurrentUserProfile, type MyCourseGradeData } from "../util/api";

interface UserProfile {
  id: number;
  name: string;
  email: string;
  student_id?: string | null;
  role: string;
}

interface Course {
  id: number;
  name: string;
}

interface CourseGrade {
  course: Course;
  data: MyCourseGradeData | null;
  error?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

// OC official grading scale
// https://www.okanagancollege.ca/office-of-the-registrar/additional-transcript-information
function toLetterGrade(score: number | null): string {
  if (score === null) return "—";
  if (score >= 90) return "A+";  // First Class
  if (score >= 85) return "A";
  if (score >= 80) return "A-";
  if (score >= 76) return "B+";  // Second Class
  if (score >= 72) return "B";
  if (score >= 68) return "B-";
  if (score >= 64) return "C+";  // Pass
  if (score >= 60) return "C";
  if (score >= 55) return "C-";
  if (score >= 50) return "D";   // Marginal Pass
  return "F";                    // Failure
}

function toClassification(score: number | null): string {
  if (score === null) return "";
  if (score >= 80) return "First Class";
  if (score >= 68) return "Second Class";
  if (score >= 55) return "Pass";
  if (score >= 50) return "Marginal Pass";
  return "Failure";
}

function gradeColorClass(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 80) return "text-green-600";
  if (score >= 68) return "text-blue-600";
  if (score >= 55) return "text-yellow-600";
  if (score >= 50) return "text-orange-600";
  return "text-red-600";
}

function progressBarColor(score: number | null): string {
  if (score === null) return "bg-muted";
  if (score >= 80) return "bg-green-500";
  if (score >= 68) return "bg-blue-500";
  if (score >= 55) return "bg-yellow-500";
  if (score >= 50) return "bg-orange-500";
  return "bg-red-500";
}

function statusChipClass(status: string): string {
  switch (status) {
    case "submitted":      return "bg-green-100 text-green-800";
    case "submitted late": return "bg-orange-100 text-orange-800";
    case "no submission":  return "bg-red-100 text-red-800";
    default:               return "bg-muted text-muted-foreground";
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export default function StudentGrades() {
  const [courseGrades, setCourseGrades] = useState<CourseGrade[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCourseId, setExpandedCourseId] = useState<number | null>(null);
  const [courseSearch, setCourseSearch] = useState("");

  const filteredCourseGrades = useMemo(
    () =>
      courseSearch.trim()
        ? courseGrades.filter((cg) =>
            cg.course.name.toLowerCase().includes(courseSearch.toLowerCase())
          )
        : courseGrades,
    [courseGrades, courseSearch]
  );

  useEffect(() => {
    (async () => {
      try {
        const [courses, profileData]: [Course[], UserProfile] = await Promise.all([
          listClasses(),
          getCurrentUserProfile(),
        ]);
        setProfile(profileData);
        const results = await Promise.all(
          courses.map(async (course) => {
            try {
              const data = await getMyCourseGrade(course.id);
              return { course, data };
            } catch {
              return { course, data: null, error: "Grade unavailable" };
            }
          })
        );
        setCourseGrades(results);
      } catch {
        setError("Failed to load your grades. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const graded = courseGrades.filter(
      (cg) => cg.data?.course_total_grade !== null && cg.data?.course_total_grade !== undefined
    );
    const grades = graded
      .map((cg) => cg.data?.course_total_grade)
      .filter((g): g is number => g !== null);

    // OC GPA is percentage-based (0–100), not 4.0 scale
    const cumulativeGpa =
      grades.length > 0
        ? (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(1)
        : null;

    return {
      cumulativeGpa,
      gradedCount: graded.length,
      totalCourses: courseGrades.length,
    };
  }, [courseGrades]);

  const handleDownloadCsv = () => {
    const rows: string[][] = [
      [
        "Course",
        "Course Grade (%)",
        "Letter Grade",
        "Standing",
        "Assignment",
        "Assignment Grade (%)",
        "Status",
        "Due Date",
        "Submitted At",
        "Grade Source",
      ],
    ];

    for (const { course, data } of courseGrades) {
      if (!data) {
        rows.push([course.name, "N/A", "—", "—", "", "", "", "", "", ""]);
        continue;
      }
      const grade = data.course_total_grade;
      const letter = toLetterGrade(grade);
      const standing = toClassification(grade);

      if (data.assignments.length === 0) {
        rows.push([
          course.name,
          grade?.toFixed(2) ?? "N/A",
          letter,
          standing,
          "",
          "",
          "",
          "",
          "",
          "",
        ]);
      } else {
        for (const a of data.assignments) {
          rows.push([
            course.name,
            grade?.toFixed(2) ?? "N/A",
            letter,
            standing,
            a.assignment_name,
            a.effective_grade?.toFixed(2) ?? "N/A",
            a.submission_status ?? "",
            a.due_date ?? "",
            a.submission?.submitted_at ?? "",
            a.grade_source ?? "",
          ]);
        }
      }
    }

    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my_grades.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="flex h-16 flex-col justify-center border-b bg-background px-6">
          <h2 className="text-xl font-semibold leading-tight">My Grades</h2>
          <span className="text-xs text-muted-foreground leading-tight">
            Track your academic performance across all courses
          </span>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading grades…</span>
          </div>
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

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b bg-background px-6">
        <div className="flex flex-col justify-center">
          <h2 className="text-xl font-semibold leading-tight">My Grades</h2>
          <span className="text-xs text-muted-foreground leading-tight">
            Track your academic performance across all courses
          </span>
        </div>
        <Button onClick={handleDownloadCsv} variant="outline" size="sm" className="gap-1.5">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">

        {/* Transcript identity cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Student Name</p>
              </div>
              <p className="text-lg font-bold truncate">{profile?.name ?? "—"}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{profile?.email ?? ""}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Grade Average</p>
              </div>
              <p className={`text-3xl font-bold ${stats.cumulativeGpa ? gradeColorClass(parseFloat(stats.cumulativeGpa)) : "text-muted-foreground"}`}>
                {stats.cumulativeGpa ? `${stats.cumulativeGpa}%` : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {stats.cumulativeGpa ? `${toLetterGrade(parseFloat(stats.cumulativeGpa))} · ${toClassification(parseFloat(stats.cumulativeGpa))}` : "no graded courses"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Courses</p>
              </div>
              <p className="text-3xl font-bold">{stats.totalCourses}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stats.gradedCount} graded · {stats.totalCourses - stats.gradedCount} pending</p>
            </CardContent>
          </Card>
        </div>

        {/* Course list */}
        {courseGrades.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <GraduationCap className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No courses yet</h3>
              <p className="text-muted-foreground">Enroll in courses to see your grades here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search courses…"
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {filteredCourseGrades.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No courses match your search.</p>
            ) : (
              filteredCourseGrades.map(({ course, data, error: courseError }) => {
              const grade = data?.course_total_grade ?? null;
              const letter = toLetterGrade(grade);
              const classification = toClassification(grade);
              const isExpanded = expandedCourseId === course.id;
              const assignments = data?.assignments ?? [];
              const submitted = assignments.filter((a) => a.submission_status !== "no submission").length;
              const missing  = assignments.filter((a) => a.submission_status === "no submission").length;
              const late     = assignments.filter((a) => a.submission_status === "submitted late").length;

              return (
                <Card key={course.id} className="overflow-hidden">
                  <button
                    className="w-full text-left"
                    onClick={() => setExpandedCourseId(isExpanded ? null : course.id)}
                  >
                    <CardHeader className="py-4 px-5 hover:bg-muted/40 transition-colors">
                      <div className="flex items-center justify-between gap-4">
                        {/* Left: chevron + name */}
                        <div className="flex items-center gap-3 min-w-0">
                          {isExpanded
                            ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                            : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          }
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{course.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {assignments.length} assignments · {submitted} submitted
                              {missing > 0 && <span className="text-red-500 ml-1">· {missing} missing</span>}
                              {late > 0 && <span className="text-orange-500 ml-1">· {late} late</span>}
                            </p>
                          </div>
                        </div>

                        {/* Right: progress bar + grade */}
                        <div className="flex items-center gap-4 shrink-0">
                          {grade !== null && (
                            <div className="hidden sm:flex items-center gap-2">
                              <div className="w-28 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${progressBarColor(grade)}`}
                                  style={{ width: `${Math.min(grade, 100)}%` }}
                                />
                              </div>
                            </div>
                          )}
                          <div className="text-right min-w-[80px]">
                            <p className={`text-xl font-bold ${gradeColorClass(grade)}`}>
                              {grade !== null
                                ? `${grade.toFixed(1)}%`
                                : courseError
                                ? "Error"
                                : "Pending"}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {letter}{classification ? ` · ${classification}` : ""}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                  </button>

                  {/* Expanded assignment breakdown */}
                  {isExpanded && (
                    <CardContent className="px-5 pb-5 pt-0">
                      <div className="border-t pt-4">
                        {assignments.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No assignments in this course yet.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                                  <th className="pb-2 pr-4">Assignment</th>
                                  <th className="pb-2 pr-4">Due</th>
                                  <th className="pb-2 pr-4">Status</th>
                                  <th className="pb-2 pr-4 text-right">Grade</th>
                                  <th className="pb-2 text-right">Letter</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {assignments.map((a) => {
                                  const aGrade = a.effective_grade;
                                  return (
                                    <tr key={a.assignment_id} className="hover:bg-muted/30 transition-colors">
                                      <td className="py-2.5 pr-4 font-medium">{a.assignment_name}</td>
                                      <td className="py-2.5 pr-4 text-muted-foreground text-xs">
                                        {a.due_date ? parseUTC(a.due_date).toLocaleDateString() : "—"}
                                      </td>
                                      <td className="py-2.5 pr-4">
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusChipClass(a.submission_status ?? "")}`}>
                                          {a.submission_status ?? "—"}
                                        </span>
                                        {a.grade_source === "override" && (
                                          <span className="ml-1.5 inline-flex items-center rounded-full bg-purple-100 text-purple-800 px-2 py-0.5 text-xs font-medium">
                                            override
                                          </span>
                                        )}
                                        {a.override_reason && (
                                          <span className="ml-1.5 text-xs text-muted-foreground italic">
                                            {a.override_reason}
                                          </span>
                                        )}
                                      </td>
                                      <td className={`py-2.5 pr-4 text-right font-semibold ${gradeColorClass(aGrade)}`}>
                                        {aGrade !== null
                                          ? `${aGrade.toFixed(1)}%`
                                          : a.grade_source === "pending"
                                          ? <span className="text-muted-foreground font-normal text-xs">Pending</span>
                                          : "—"}
                                      </td>
                                      <td className={`py-2.5 text-right font-mono font-bold ${gradeColorClass(aGrade)}`}>
                                        {toLetterGrade(aGrade)}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
