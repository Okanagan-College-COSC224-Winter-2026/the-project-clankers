import { useEffect, useState } from 'react';
import { getCriteria } from '../util/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Criterion {
  id?: number;
  rubricID?: number;
  question: string;
  description?: string;
  scoreMax: number;
  hasScore: boolean;
  canComment?: boolean;
  criteriaType?: 'internal' | 'external' | 'both';
}

interface RubricViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  rubricId: number | null;
  internalReviewEnabled?: boolean;
  externalReviewEnabled?: boolean;
}

export default function RubricViewModal({ isOpen, onClose, rubricId, internalReviewEnabled = true, externalReviewEnabled = true }: RubricViewModalProps) {
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && rubricId) {
      (async () => {
        try {
          setLoading(true);
          const criteriaData = await getCriteria(rubricId);
          setCriteria(criteriaData || []);
        } catch (error) {
          console.error('Error loading rubric criteria:', error);
          setCriteria([]);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [isOpen, rubricId]);

  const filterCriteriaByType = (type: 'internal' | 'external'): Criterion[] => {
    return criteria.filter(c =>
      !c.criteriaType || c.criteriaType === 'both' || c.criteriaType === type
    );
  };

  const internalCriteria = filterCriteriaByType('internal');
  const externalCriteria = filterCriteriaByType('external');

  const renderCriteriaSection = (title: string, criteriaList: Criterion[]) => (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-4 p-3 bg-blue-50 rounded border-l-4 border-blue-500">
        {title}
      </h3>
      {criteriaList.length === 0 ? (
        <p className="text-gray-500 italic py-4">No criteria for this type</p>
      ) : (
        <div className="space-y-4">
          {criteriaList.map((criterion, idx) => (
            <div key={criterion.id || idx} className="border rounded-lg p-4 bg-white">
              {/* Criterion Question */}
              <div className="mb-2">
                <h4 className="font-semibold text-base text-gray-800">{criterion.question}</h4>
              </div>

              {/* Criterion Description (if available) */}
              {criterion.description && (
                <div className="mb-3 p-2 bg-gray-50 rounded">
                  <p className="text-sm text-gray-700">{criterion.description}</p>
                </div>
              )}

              {/* Score Display */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Max Score:</span>
                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded font-medium">
                  {criterion.hasScore ? criterion.scoreMax : '100'}
                </span>
              </div>

              {/* Comments Enabled Badge */}
              {criterion.canComment && (
                <div className="mt-2">
                  <span className="inline-block px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                    Comments Enabled
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent showCloseButton={true} className="!max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rubric</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-gray-500">Loading rubric...</p>
          </div>
        ) : criteria.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-gray-500">No rubric available for this assignment</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Internal Section - only show if internal review is enabled */}
            {internalReviewEnabled && renderCriteriaSection('Internal', internalCriteria)}

            {/* External Section - only show if external review is enabled */}
            {externalReviewEnabled && renderCriteriaSection('External', externalCriteria)}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
