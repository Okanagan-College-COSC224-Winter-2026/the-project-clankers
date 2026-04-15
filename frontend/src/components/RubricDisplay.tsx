import { useEffect, useState } from 'react';
import { getCriteria, getRubric } from '../util/api';

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

interface RubricDisplayProps {
    rubricId: number | null;
    onCriterionSelect: (row: number, column: number) => void;
    grades: number[];
    internalReviewEnabled?: boolean;
    externalReviewEnabled?: boolean;
}

interface RubricInfo {
    id: number;
    assignmentID: number;
    canComment: boolean;
    grades: number[];
}

export default function RubricDisplay({
    rubricId,
    onCriterionSelect,
    grades,
    internalReviewEnabled = false,
    externalReviewEnabled = false
}: RubricDisplayProps) {
    const [criteria, setCriteria] = useState<Criterion[]>([]);
    const [rubricInfo, setRubricInfo] = useState<RubricInfo | null>(null);
    const [activeTab, setActiveTab] = useState<'internal' | 'external'>('internal');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            if (rubricId) {
                try {
                    setLoading(true);
                    const [criteriaResp, rubricResp] = await Promise.all([
                        getCriteria(rubricId),
                        getRubric(rubricId)
                    ]);
                    setCriteria(criteriaResp);
                    setRubricInfo(rubricResp);
                } finally {
                    setLoading(false);
                }
            }
        };
        loadData();
    }, [rubricId]);

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

    if (!rubricId) {
        return (
            <div>
                <p>No rubric available yet</p>
            </div>
        );
    }

    // Only show tabs if both review types are enabled
    const showTabs = internalReviewEnabled && externalReviewEnabled;

    return (
        <>
            {loading ? (
                <p className="text-gray-500">Loading rubric...</p>
            ) : criteria.length === 0 ? (
                <p className="text-gray-500">No rubric available yet</p>
            ) : (
                <>
                    {showTabs && (
                        <div className="flex gap-2 mb-6 border-b">
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
                        </div>
                    )}
                    {activeTab === 'internal' && renderCriteriaList(internalCriteria)}
                    {activeTab === 'external' && renderCriteriaList(externalCriteria)}
                </>
            )}
        </>
    );
}
