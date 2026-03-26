import { useState, useEffect } from 'react';
import StatusMessage from './StatusMessage';
import { createCriteria, createRubric, getRubric, getCriteria, deleteCriteria, getAssignmentDetails } from '../util/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface RubricCreatorProps {
    onRubricCreated?: (rubricId: number) => void;
    id: number;
}

const CRITERIA_TYPE_OPTIONS = [
    { value: 'both' as const, label: 'For Both' },
    { value: 'internal' as const, label: 'For Internal Only' },
    { value: 'external' as const, label: 'For External Only' }
] as const;

const getCriteriaTypeDisplay = (type?: string): string => {
    const option = CRITERIA_TYPE_OPTIONS.find(opt => opt.value === type);
    return option?.label || 'For Both';
};

export default function RubricCreator({ onRubricCreated, id }: RubricCreatorProps) {
    const [statusMessage, setStatusMessage] = useState('');
    const [statusType, setStatusType] = useState<'error' | 'success'>('error');
    const [rubricId, setRubricId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [existingCriteria, setExistingCriteria] = useState<Criterion[]>([]);
    const [assignmentType, setAssignmentType] = useState<'individual' | 'group'>('individual');
    const [newCriteria, setNewCriteria] = useState<Criterion[]>([]);
    const [internalReview, setInternalReview] = useState(false);
    const [externalReview, setExternalReview] = useState(false);

    // Load existing rubric, criteria, and check assignment type on mount
    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);

                // Get assignment type and review settings
                const assignmentResp = await getAssignmentDetails(id);
                const asnType = assignmentResp.submission_type || 'individual';
                setAssignmentType(asnType);
                setInternalReview(assignmentResp.internal_review || false);
                setExternalReview(assignmentResp.external_review || false);

                // Set initial criteria type based on assignment type and review settings
                let defaultType = 'external';
                if (asnType === 'group') {
                    if (assignmentResp.internal_review && !assignmentResp.external_review) {
                        defaultType = 'internal';
                    } else if (!assignmentResp.external_review) {
                        defaultType = 'internal';
                    } else {
                        defaultType = 'both';
                    }
                }
                setNewCriteria([{
                    rubricID: 0,
                    question: '',
                    scoreMax: 0,
                    hasScore: true,
                    description: '',
                    criteriaType: defaultType
                }]);

                const rubricResp = await getRubric(id, true); // true = use as assignmentID
                if (rubricResp && rubricResp.id) {
                    setRubricId(rubricResp.id);

                    // Load existing criteria
                    const criteriaResp = await getCriteria(rubricResp.id);
                    if (criteriaResp && criteriaResp.length > 0) {
                        setExistingCriteria(criteriaResp);
                        setNewCriteria([]); // Clear new criteria if we have existing ones
                    }
                }
            } catch {
                console.log('No existing rubric found, will create new one');
                // No rubric exists yet, that's okay, user can create one
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [id]);

    const handleCreate = async () => {
        try {
            setStatusMessage('');

            // Create or get existing rubric
            let targetRubricId = rubricId;
            if (!targetRubricId) {
                const rubricResponse = await createRubric(id, id, false);
                targetRubricId = rubricResponse.id;
                setRubricId(targetRubricId);
            }

            // Only create criteria for NEW entries (not existing ones)
            if (newCriteria.length > 0 && newCriteria[0].question !== '') {
                await Promise.all(newCriteria.map(({ question, scoreMax, hasScore, description, criteriaType }) => {
                    // For individual assignments, force 'external'
                    const finalCriteriaType = assignmentType === 'individual' ? 'external' : (criteriaType || 'both');
                    return createCriteria(targetRubricId, question, scoreMax, false, hasScore, description || '', finalCriteriaType);
                }));
            }

            setStatusType('success');
            setStatusMessage('Rubric saved successfully!');
            setTimeout(() => window.location.reload(), 1500);
            if (onRubricCreated) {
                onRubricCreated(targetRubricId);
            }
        } catch (error) {
            console.error("Error creating criteria:", error);
            setStatusType('error');
            setStatusMessage(`Error saving rubric: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleQuestionChange = (index: number, value: string) => {
        const updatedCriteria = [...newCriteria];
        updatedCriteria[index].question = value;
        setNewCriteria(updatedCriteria);
    };

    const handleScoreMaxChange = (index: number, value: number) => {
        const updatedCriteria = [...newCriteria];
        updatedCriteria[index].scoreMax = Math.max(0, value);
        setNewCriteria(updatedCriteria);
    };

    const handleHasScoreChange = (index: number, value: boolean) => {
        const updatedCriteria = [...newCriteria];
        updatedCriteria[index].hasScore = value;
        if (!value) {
            updatedCriteria[index].scoreMax = 0;
        }
        setNewCriteria(updatedCriteria);
    };

    const handleDescriptionChange = (index: number, value: string) => {
        const updatedCriteria = [...newCriteria];
        updatedCriteria[index].description = value;
        setNewCriteria(updatedCriteria);
    };

    const handleCriteriaTypeChange = (index: number, value: string) => {
        if (!['internal', 'external', 'both'].includes(value)) return;
        // Validate that the selected value is in available options
        const availableValues = getAvailableCriteriaTypeOptions().map(opt => opt.value);
        if (!availableValues.includes(value as any)) return;
        const updatedCriteria = [...newCriteria];
        updatedCriteria[index].criteriaType = value as 'internal' | 'external' | 'both';
        setNewCriteria(updatedCriteria);
    };

    const handleAddNewSection = () => {
        const availableOptions = getAvailableCriteriaTypeOptions();
        const defaultType = availableOptions[0]?.value || 'both';
        setNewCriteria(prev => [...prev, { rubricID: 0, question: '', scoreMax: 0, hasScore: true, description: '', criteriaType: defaultType }]);
    };

    const handleRemoveSection = (index: number) => setNewCriteria(prev => prev.filter((_, i) => i !== index));

    const getAvailableCriteriaTypeOptions = () => {
        if (assignmentType === 'individual') {
            return CRITERIA_TYPE_OPTIONS.filter(opt => opt.value === 'external');
        }

        // For group assignments, filter based on enabled review types
        const available = [];
        if (internalReview) {
            available.push(CRITERIA_TYPE_OPTIONS.find(opt => opt.value === 'internal')!);
        }
        if (externalReview) {
            available.push(CRITERIA_TYPE_OPTIONS.find(opt => opt.value === 'external')!);
        }
        // Only include 'both' if BOTH review types are enabled
        if (internalReview && externalReview) {
            available.push(CRITERIA_TYPE_OPTIONS.find(opt => opt.value === 'both')!);
        }

        return available.length > 0 ? available : [CRITERIA_TYPE_OPTIONS[0]]; // Fallback to 'both'
    };

    const handleDeleteExistingCriteria = async (criteriaId: number) => {
        if (!window.confirm('Are you sure you want to delete this criterion? This will affect all existing reviews.')) {
            return;
        }

        try {
            setStatusMessage('Deleting criterion...');
            setStatusType('success');

            console.log('Attempting to delete criteria ID:', criteriaId);
            await deleteCriteria(criteriaId);

            // Remove from local state
            setExistingCriteria(prev => prev.filter(c => c.id !== criteriaId));

            setStatusType('success');
            setStatusMessage('Criterion deleted successfully!');

            // Clear message after 3 seconds
            setTimeout(() => setStatusMessage(''), 3000);
        } catch (error) {
            console.error("Error deleting criterion:", error);
            console.error("Error details:", {
                message: error instanceof Error ? error.message : 'Unknown',
                criteriaId,
                stack: error instanceof Error ? error.stack : 'No stack'
            });
            setStatusType('error');
            setStatusMessage(`Error deleting criterion: ${error instanceof Error ? error.message : 'Unknown error'}. Check browser console for details.`);
        }
    };

    return (
        <Card className="my-5">
            <CardHeader>
                <CardTitle>{rubricId ? 'Manage Rubric Criteria' : 'Create New Rubric'}</CardTitle>
            </CardHeader>
            <CardContent>
                <StatusMessage message={statusMessage} type={statusType} />

                {isLoading ? (
                    <p>Loading rubric...</p>
                ) : (
                    <>
                        {/* Show existing criteria */}
                        {existingCriteria.length > 0 && (
                            <div className="bg-blue-50 p-4 rounded border-l-4 border-blue-500 mb-5">
                                <h3 className="font-semibold mb-2">Existing Criteria</h3>
                                {existingCriteria.map((item, index) => (
                                    <div key={item.id || index} className="p-3 my-2 bg-white rounded flex justify-between items-center gap-3">
                                        <div className="flex-1">
                                            <div><strong>{item.question}</strong></div>
                                            <div className="text-sm text-gray-600 mt-1">
                                                {item.hasScore && <span> Max score: {item.scoreMax}</span>}
                                                {!item.hasScore && <span>(Comment only)</span>}
                                                <span className="ml-3 inline-block px-2 py-0.5 bg-gray-200 rounded text-xs font-medium">
                                                    {assignmentType === 'group' ? getCriteriaTypeDisplay(item.criteriaType) : 'External Only'}
                                                </span>
                                            </div>
                                        </div>
                                        <Button
                                            onClick={() => handleDeleteExistingCriteria(item.id!)}
                                            variant="destructive"
                                            size="sm"
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Add new criteria */}
                        <h3 className="font-semibold mb-2">{rubricId ? 'Add More Criteria' : 'Create Criteria'}</h3>
                        {newCriteria.map((item, index) => (
                            <div key={index} className="mb-6 p-4 bg-white rounded shadow-sm border">
                                {/* Line 1: Criteria Question */}
                                <div className="mb-4">
                                    <Input
                                        type="text"
                                        value={item.question}
                                        onChange={(e) => handleQuestionChange(index, e.target.value)}
                                        placeholder="Enter question"
                                        className="w-full"
                                    />
                                </div>

                                {/* Line 2: Score Option */}
                                <div className="mb-4 flex gap-3 items-center">
                                    <Label className="flex items-center gap-2 whitespace-nowrap">
                                        <Checkbox
                                            checked={item.hasScore}
                                            onCheckedChange={(checked) => handleHasScoreChange(index, checked === true)}
                                        />
                                        Has Score
                                    </Label>
                                    {item.hasScore && (
                                        <Input
                                            type="number"
                                            min={0}
                                            value={item.scoreMax}
                                            onChange={(e) => handleScoreMaxChange(index, Number(e.target.value))}
                                            placeholder="Max score"
                                            className="w-32"
                                        />
                                    )}
                                </div>

                                {!item.hasScore && (
                                    <div className="mb-4">
                                        <Textarea
                                            value={item.description || ''}
                                            onChange={(e) => handleDescriptionChange(index, e.target.value)}
                                            placeholder="Enter description (visible to all students)"
                                            rows={2}
                                            className="w-full"
                                        />
                                    </div>
                                )}

                                {/* Line 3: Category Selection (Radio Buttons) - Only for group assignments */}
                                {assignmentType === 'group' ? (
                                    <div className="mb-4">
                                        {getAvailableCriteriaTypeOptions().length === 1 ? (
                                            <div className="p-2 bg-gray-50 border border-gray-300 rounded text-sm text-gray-600">
                                                Category: <span className="font-medium">{getCriteriaTypeDisplay(getAvailableCriteriaTypeOptions()[0].value)}</span>
                                            </div>
                                        ) : (
                                            <>
                                                <p className="text-sm font-medium text-gray-700 mb-3">Criteria Category:</p>
                                                <div className="flex gap-6">
                                                    {getAvailableCriteriaTypeOptions().map(option => (
                                                        <Label key={option.value} className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                name={`criteria-type-${index}`}
                                                                value={option.value}
                                                                checked={item.criteriaType === option.value}
                                                                onChange={(e) => handleCriteriaTypeChange(index, e.target.value)}
                                                                className="cursor-pointer"
                                                            />
                                                            <span>{option.label}</span>
                                                        </Label>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <div className="mb-4 p-2 bg-gray-50 border border-gray-300 rounded text-sm text-gray-600">
                                        Category: <span className="font-medium">External Only</span> (individual assignments only have external reviews)
                                    </div>
                                )}

                                <Button variant="outline" onClick={() => handleRemoveSection(index)}>Remove</Button>
                            </div>
                        ))}

                        <div className="flex gap-2.5 mt-5">
                            <Button variant="outline" onClick={handleAddNewSection}>Add New Criterion</Button>
                            <Button onClick={handleCreate}>
                                {rubricId ? 'Save Changes' : 'Create Rubric'}
                            </Button>
                        </div>

                        <p className="mt-4 p-2.5 bg-amber-50 border border-amber-400 rounded text-amber-800 font-medium">
                            Click "{rubricId ? 'Save Changes' : 'Create Rubric'}" to save your criteria to the database.
                        </p>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
