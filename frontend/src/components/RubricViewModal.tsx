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
  const [activeTab, setActiveTab] = useState<'internal' | 'external'>('internal');

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

  // Set initial tab based on what's enabled
  useEffect(() => {
    if (internalReviewEnabled) {
      setActiveTab('internal');
    } else if (externalReviewEnabled) {
      setActiveTab('external');
    }
  }, [internalReviewEnabled, externalReviewEnabled]);

  const filterCriteriaByType = (type: 'internal' | 'external'): Criterion[] => {
    return criteria.filter(c =>
      !c.criteriaType || c.criteriaType === 'both' || c.criteriaType === type
    );
  };

  const internalCriteria = filterCriteriaByType('internal');
  const externalCriteria = filterCriteriaByType('external');

  const renderCriteriaList = (criteriaList: Criterion[]) => {
    if (criteriaList.length === 0) {
      return <p className="text-center text-gray-400 py-8">No criteria for this review type</p>;
    }

    return (
      <div className="space-y-4">
        {criteriaList.map((criterion, idx) => (
          <div key={criterion.id || idx} className="border rounded-lg p-4 bg-white">
            <div className="flex justify-between items-start gap-4 mb-2">
              <h4 className="font-semibold text-base text-gray-800">{criterion.question}</h4>
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded font-medium text-sm whitespace-nowrap">
                {(!criterion.hasScore || criterion.scoreMax === 0) ? '100' : criterion.scoreMax}
              </span>
            </div>
            {criterion.description && (
              <p className="text-sm text-gray-600">{criterion.description}</p>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent showCloseButton={true} className="!max-w-6xl h-[85vh] flex flex-col">
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
          <>
            {/* Sticky Tabs - Outside the scrollable/centered area */}
            <div className="flex gap-2 mb-6 border-b">
              {internalReviewEnabled && (
                <button
                  onClick={() => setActiveTab('internal')}
                  className={`px-4 py-2 font-medium transition-colors ${
                    activeTab === 'internal'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Internal Review
                </button>
              )}
              {externalReviewEnabled && (
                <button
                  onClick={() => setActiveTab('external')}
                  className={`px-4 py-2 font-medium transition-colors ${
                    activeTab === 'external'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  External Review
                </button>
              )}
            </div>

            {/* Vertically Centered Scrollable Content */}
            <div className="flex-1 overflow-y-auto flex items-start justify-center">
              <div className="w-full">
                {activeTab === 'internal' && internalReviewEnabled && renderCriteriaList(internalCriteria)}
                {activeTab === 'external' && externalReviewEnabled && renderCriteriaList(externalCriteria)}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
