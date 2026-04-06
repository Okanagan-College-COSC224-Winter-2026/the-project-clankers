import { useState, useEffect } from 'react';
import StatusMessage from './StatusMessage';
import { createCriteria, createRubric, getRubric, getCriteria, deleteCriteria, getAssignmentDetails, getAssignmentsByClass } from '../util/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
    const [courseId, setCourseId] = useState<number | null>(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const [pastAssignments, setPastAssignments] = useState<Array<any>>([]);
    const [pastRubrics, setPastRubrics] = useState<Map<number, Criterion[]>>(new Map());
    const [importPreview, setImportPreview] = useState<{ rubric: Criterion[], assignmentId: number } | null>(null);

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
                setCourseId(assignmentResp.courseID || null);

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
                    criteriaType: defaultType,
                    canComment: false
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
                await Promise.all(newCriteria.map(({ question, scoreMax, hasScore, description, criteriaType, canComment }) => {
                    // For individual assignments, force 'external'
                    const finalCriteriaType = assignmentType === 'individual' ? 'external' : (criteriaType || 'both');
                    return createCriteria(targetRubricId, question, scoreMax, canComment || false, hasScore, description || '', finalCriteriaType);
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

    const handleCanCommentChange = (index: number, value: boolean) => {
        const updatedCriteria = [...newCriteria];
        updatedCriteria[index].canComment = value;
        setNewCriteria(updatedCriteria);
    };

    const handleAddNewSection = () => {
        const availableOptions = getAvailableCriteriaTypeOptions();
        const defaultType = availableOptions[0]?.value || 'both';
        setNewCriteria(prev => [...prev, { rubricID: 0, question: '', scoreMax: 0, hasScore: true, description: '', criteriaType: defaultType, canComment: false }]);
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

    const handleOpenImportModal = async () => {
        try {
            setShowImportModal(true);
            if (pastAssignments.length === 0 && courseId) {
                // Load past assignments from the same course
                const assignments = await getAssignmentsByClass(courseId);
                // Filter out the current assignment and assignments without rubrics
                const otherAssignments = assignments.filter((a: any) => a.id !== id);
                setPastAssignments(otherAssignments);

                // Load rubrics for each assignment
                const rubricMap = new Map<number, Criterion[]>();
                for (const assignment of otherAssignments) {
                    try {
                        const rubric = await getRubric(assignment.id, true);
                        if (rubric && rubric.id) {
                            const criteria = await getCriteria(rubric.id);
                            if (criteria && criteria.length > 0) {
                                rubricMap.set(assignment.id, criteria);
                            }
                        }
                    } catch {
                        // Assignment doesn't have a rubric, skip it
                    }
                }
                setPastRubrics(rubricMap);
            }
        } catch (error) {
            console.error('Error loading past assignments:', error);
            setStatusType('error');
            setStatusMessage('Failed to load past assignments');
        }
    };

    const handleImportRubric = (assignmentId: number) => {
        const criteria = pastRubrics.get(assignmentId);
        if (criteria) {
            setImportPreview({ rubric: criteria, assignmentId });
        }
    };

    const isCompatibleCriteriaType = (criteriaType: string): boolean => {
        if (assignmentType === 'individual') {
            // Individual assignments only support external
            return criteriaType === 'external';
        }

        const availableTypes = getAvailableCriteriaTypeOptions().map(opt => opt.value);

        // Check if criteria type is in available types
        if (availableTypes.includes(criteriaType as any)) {
            return true;
        }

        // 'both' is only compatible if both review types are actually enabled
        if (criteriaType === 'both' && internalReview && externalReview) {
            return true;
        }

        return false;
    };

    const getConvertedCriteriaType = (criteriaType: string): string => {
        // For individual assignments, convert everything to external
        if (assignmentType === 'individual') {
            return 'external';
        }

        // For group assignments, get available types
        const availableTypes = getAvailableCriteriaTypeOptions().map(opt => opt.value);

        // If the criteria type is already in available types, keep it
        if (availableTypes.includes(criteriaType as any)) {
            return criteriaType;
        }

        // Otherwise convert to first available type
        if (availableTypes.length > 0) {
            return availableTypes[0];
        }
        return 'both';
    };

    const handleConfirmImport = async (strategy: 'convert' | 'skip' | 'perfect') => {
        if (!importPreview) return;

        let importedCriteria: Criterion[] = [];
        const availableTypes = getAvailableCriteriaTypeOptions().map(opt => opt.value);

        // Get existing question strings to check for duplicates
        const existingQuestions = new Set(existingCriteria.map(c => c.question.toLowerCase().trim()));

        if (strategy === 'convert') {
            // Convert all criteria to compatible types
            importedCriteria = importPreview.rubric
                .filter(c => !existingQuestions.has(c.question.toLowerCase().trim()))
                .map(c => ({
                    rubricID: 0,
                    question: c.question,
                    scoreMax: c.scoreMax,
                    hasScore: c.hasScore,
                    description: c.description,
                    criteriaType: getConvertedCriteriaType(c.criteriaType) as 'internal' | 'external' | 'both',
                    canComment: c.canComment || false
                }));
        } else if (strategy === 'skip') {
            // Skip incompatible, but include 'both' and convert it to what's needed
            importedCriteria = importPreview.rubric
                .filter(c => {
                    // Include exact matches or 'both'
                    return (availableTypes.includes(c.criteriaType as any) || c.criteriaType === 'both') &&
                           !existingQuestions.has(c.question.toLowerCase().trim());
                })
                .map(c => ({
                    rubricID: 0,
                    question: c.question,
                    scoreMax: c.scoreMax,
                    hasScore: c.hasScore,
                    description: c.description,
                    criteriaType: c.criteriaType === 'both' ? (availableTypes[0] as 'internal' | 'external' | 'both') : (c.criteriaType as 'internal' | 'external' | 'both'),
                    canComment: c.canComment || false
                }));
        } else {
            // Perfect match only - only import exact matches (exclude 'both')
            importedCriteria = importPreview.rubric
                .filter(c => availableTypes.includes(c.criteriaType as any) &&
                            !existingQuestions.has(c.question.toLowerCase().trim()))
                .map(c => ({
                    rubricID: 0,
                    question: c.question,
                    scoreMax: c.scoreMax,
                    hasScore: c.hasScore,
                    description: c.description,
                    criteriaType: c.criteriaType as 'internal' | 'external' | 'both',
                    canComment: c.canComment || false
                }));
        }

        if (importedCriteria.length === 0) {
            setStatusType('error');
            const duplicatesExcluded = importPreview.rubric.length;
            let message = 'All criteria are duplicates of existing criteria and were excluded.';
            if (duplicatesExcluded === 1) {
                message = 'This criterion is a duplicate of an existing criterion.';
            }
            setStatusMessage(message);
            setImportPreview(null);
            setShowImportModal(false);
            return;
        }

        try {
            // Create or get existing rubric
            let targetRubricId = rubricId;
            if (!targetRubricId) {
                const rubricResponse = await createRubric(id, id, false);
                targetRubricId = rubricResponse.id;
                setRubricId(targetRubricId);
            }

            // Create all imported criteria in the database
            await Promise.all(importedCriteria.map(({ question, scoreMax, hasScore, description, criteriaType, canComment }) => {
                // For individual assignments, force 'external'
                const finalCriteriaType = assignmentType === 'individual' ? 'external' : (criteriaType || 'both');
                return createCriteria(targetRubricId, question, scoreMax, canComment || false, hasScore, description || '', finalCriteriaType);
            }));

            setImportPreview(null);
            setShowImportModal(false);
            setStatusType('success');
            const duplicatesExcluded = importPreview.rubric.length - importedCriteria.length;
            let message = `Rubric imported successfully! (${importedCriteria.length} criteria imported)`;
            if (duplicatesExcluded > 0) {
                message += ` - ${duplicatesExcluded} duplicate ${duplicatesExcluded === 1 ? 'criterion was' : 'criteria were'} excluded`;
            }
            setStatusMessage(message);
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            console.error("Error importing rubric:", error);
            setStatusType('error');
            setStatusMessage(`Error importing rubric: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setImportPreview(null);
            setShowImportModal(false);
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
                                                {item.canComment && <span className="ml-2 inline-block px-2 py-0.5 bg-green-200 rounded text-xs font-medium">Comments Enabled</span>}
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

                                {/* Comment Option */}
                                <div className="mb-4">
                                    <Label className="flex items-center gap-2 whitespace-nowrap">
                                        <Checkbox
                                            checked={item.canComment || false}
                                            onCheckedChange={(checked) => handleCanCommentChange(index, checked === true)}
                                        />
                                        Reviewer can Comment
                                    </Label>
                                </div>

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
                            <Button variant="outline" onClick={handleOpenImportModal}>
                                Import Rubric
                            </Button>
                        </div>

                        <p className="mt-4 p-2.5 bg-amber-50 border border-amber-400 rounded text-amber-800 font-medium">
                            Click "{rubricId ? 'Save Changes' : 'Create Rubric'}" to save your criteria to the database.
                        </p>
                    </>
                )}
            </CardContent>

            {/* Import Rubric Modal */}
            <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
                <DialogContent className="!max-w-5xl">
                    <DialogHeader>
                        <DialogTitle>Import Rubric from Past Assignment</DialogTitle>
                        <DialogDescription>
                            Select an assignment to import its rubric criteria. The scores, descriptions, and categories will be copied.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {pastRubrics.size === 0 ? (
                            <p className="text-gray-500 py-4">No past assignments with rubrics found in this class.</p>
                        ) : (
                            pastAssignments.map(assignment => {
                                const hasCriteria = pastRubrics.has(assignment.id);
                                if (!hasCriteria) return null;

                                const criteria = pastRubrics.get(assignment.id) || [];
                                return (
                                    <div key={assignment.id} className="border rounded-lg p-4 hover:bg-gray-50">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="font-semibold text-gray-800">{assignment.name}</p>
                                                <p className="text-sm text-gray-600 mt-1">{criteria.length} criterion/criteria</p>
                                            </div>
                                            <Button
                                                onClick={() => handleImportRubric(assignment.id)}
                                                size="sm"
                                            >
                                                Import
                                            </Button>
                                        </div>
                                        <div className="text-sm text-gray-600 space-y-1">
                                            {criteria.slice(0, 3).map((c, idx) => (
                                                <p key={idx} className="line-clamp-1">
                                                    • {c.question}
                                                </p>
                                            ))}
                                            {criteria.length > 3 && (
                                                <p className="text-gray-500">+ {criteria.length - 3} more...</p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Import Preview Dialog */}
            <Dialog open={!!importPreview} onOpenChange={(open) => !open && setImportPreview(null)}>
                <DialogContent className="!max-w-5xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>Review Criteria for Import</DialogTitle>
                        <DialogDescription>
                            Some criteria may not be compatible with this assignment's review settings. Choose how to handle them.
                        </DialogDescription>
                    </DialogHeader>
                    {importPreview && (
                        <div className="space-y-4">
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {importPreview.rubric.map((criterion, idx) => {
                                    const compatible = isCompatibleCriteriaType(criterion.criteriaType);
                                    const converted = getConvertedCriteriaType(criterion.criteriaType);

                                    return (
                                        <div
                                            key={idx}
                                            className={`border rounded-lg p-3 ${
                                                compatible ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
                                            }`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-800">{criterion.question}</p>
                                                    <div className="flex gap-3 mt-1 text-sm text-gray-600">
                                                        {criterion.hasScore && (
                                                            <span>Max score: {criterion.scoreMax}</span>
                                                        )}
                                                        {!criterion.hasScore && <span>Comment only</span>}
                                                        {criterion.canComment && <span className="text-green-700 font-medium">Comments Enabled</span>}
                                                        <span className="font-medium">{getCriteriaTypeDisplay(criterion.criteriaType)}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    {compatible ? (
                                                        <span className="text-sm font-medium text-green-700">✓ Compatible</span>
                                                    ) : (
                                                        <div className="text-sm">
                                                            <p className="text-orange-700 font-medium">Will convert to:</p>
                                                            <p className="text-orange-600 font-medium">{getCriteriaTypeDisplay(converted)}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex gap-3 justify-end">
                                <Button variant="outline" onClick={() => setImportPreview(null)}>
                                    Cancel
                                </Button>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="outline" onClick={() => handleConfirmImport('perfect')}>
                                        Perfect Match Only
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Only import criteria with exact type matches. No conversions or "For Both" criteria will be included.
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="outline" onClick={() => handleConfirmImport('skip')}>
                                        Skip Incompatible
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Import criteria that match this assignment's settings. Incompatible types are skipped, but "For Both" criteria are included and converted as needed.
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button onClick={() => handleConfirmImport('convert')}>
                                        Force Convert
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Import all criteria and automatically convert incompatible types to match this assignment's review settings.
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </Card>
    );
}
