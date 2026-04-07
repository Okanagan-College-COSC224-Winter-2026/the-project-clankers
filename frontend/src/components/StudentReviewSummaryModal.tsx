import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { getStudentReviewSummary, StudentReviewSummary } from "../util/api";

interface Props {
  assignmentId: number;
  studentId: number | null;
  studentName: string;
  onClose: () => void;
}

export default function StudentReviewSummaryModal({
  assignmentId,
  studentId,
  studentName,
  onClose,
}: Props) {
  const [data, setData] = useState<StudentReviewSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (studentId === null) return;
    setLoading(true);
    setError(null);
    setData(null);
    getStudentReviewSummary(assignmentId, studentId)
      .then(setData)
      .catch((err) => setError(err.message ?? "Failed to load review data"))
      .finally(() => setLoading(false));
  }, [assignmentId, studentId]);

  const fmtGrade = (grade: number | null) =>
    grade !== null ? `${grade.toFixed(1)}%` : "—";

  const renderTable = (
    rows: { name: string; grade: number | null; type: string }[],
    nameHeader: string
  ) => (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="bg-gray-100 text-left text-xs text-gray-600 uppercase">
          <th className="px-3 py-2 font-semibold">{nameHeader}</th>
          <th className="px-3 py-2 font-semibold">Type</th>
          <th className="px-3 py-2 font-semibold text-right">Grade</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={3} className="px-3 py-3 text-center text-muted-foreground italic">
              No reviews
            </td>
          </tr>
        ) : (
          rows.map((row, i) => (
            <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
              <td className="px-3 py-2">{row.name}</td>
              <td className="px-3 py-2 capitalize text-muted-foreground">{row.type}</td>
              <td className="px-3 py-2 text-right font-medium">{fmtGrade(row.grade)}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );

  return (
    <Dialog open={studentId !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Breakdown — {studentName}</DialogTitle>
        </DialogHeader>

        {loading && (
          <p className="text-center text-muted-foreground italic py-6">Loading...</p>
        )}
        {error && (
          <p className="text-center text-red-600 py-4">{error}</p>
        )}

        {data && !loading && (
          <div className="space-y-6 mt-2">
            {/* Reviews Given */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm text-foreground">Reviews Given</h3>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-medium">
                  Avg: {fmtGrade(data.avg_given)}
                </span>
              </div>
              <div className="rounded-lg border border-border overflow-hidden">
                {renderTable(
                  data.reviews_given.map((r) => ({ name: r.reviewee_name, grade: r.grade, type: r.type })),
                  "Reviewed"
                )}
              </div>
            </div>

            {/* Reviews Received */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm text-foreground">Reviews Received</h3>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded font-medium">
                  Avg: {fmtGrade(data.avg_received)}
                </span>
              </div>
              <div className="rounded-lg border border-border overflow-hidden">
                {renderTable(
                  data.reviews_received.map((r) => ({ name: r.reviewer_name, grade: r.grade, type: r.type })),
                  "Reviewer"
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
