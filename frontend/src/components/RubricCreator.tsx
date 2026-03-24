import { useState, useEffect } from 'react';
import StatusMessage from './StatusMessage';
import { createCriteria, createRubric, getRubric, getCriteria, deleteCriteria } from '../util/api';
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

export default function RubricCreator({ onRubricCreated, id }: RubricCreatorProps) {
    const [newCriteria, setNewCriteria] = useState<Criterion[]>([{ rubricID: 0, question: '', scoreMax: 0, hasScore: true, description: '' }]);
    const [statusMessage, setStatusMessage] = useState('');
    const [statusType, setStatusType] = useState<'error' | 'success'>('error');
    const [rubricId, setRubricId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [existingCriteria, setExistingCriteria] = useState<Criterion[]>([]);

    // Load existing rubric and criteria on mount
    useEffect(() => {
        const loadExistingRubric = async () => {
            try {
                setIsLoading(true);
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

        loadExistingRubric();
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
                await Promise.all(newCriteria.map(({ question, scoreMax, hasScore, description }) =>
                    createCriteria(targetRubricId, question, scoreMax, false, hasScore, description || '')
                ));
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

    const handleAddNewSection = () => setNewCriteria(prev => [...prev, { rubricID: 0, question: '', scoreMax: 0, hasScore: true, description: '' }]);

    const handleRemoveSection = (index: number) => setNewCriteria(prev => prev.filter((_, i) => i !== index));

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
                                    <div key={item.id || index} className="p-2.5 my-1 bg-white rounded flex justify-between items-center gap-2.5">
                                        <div>
                                            <strong>{item.question}</strong>
                                            {item.hasScore && <span> (Max score: {item.scoreMax})</span>}
                                            {!item.hasScore && <span> (Comment only)</span>}
                                        </div>
                                        <div>
                                            <Button
                                                onClick={() => handleDeleteExistingCriteria(item.id!)}
                                                variant="destructive"
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Add new criteria */}
                        <h3 className="font-semibold mb-2">{rubricId ? 'Add More Criteria' : 'Create Criteria'}</h3>
                        {newCriteria.map((item, index) => (
                            <div key={index} className="flex gap-2.5 items-center mb-4 p-2.5 bg-white rounded shadow-sm">
                                <Input
                                    type="text"
                                    value={item.question}
                                    onChange={(e) => handleQuestionChange(index, e.target.value)}
                                    placeholder="Enter question"
                                />
                                <Label className="flex items-center gap-1">
                                    Has score:
                                    <Checkbox
                                        checked={item.hasScore}
                                        onCheckedChange={(checked) => handleHasScoreChange(index, checked === true)}
                                    />
                                </Label>
                                {item.hasScore && (
                                    <Input
                                        type="number"
                                        min={0}
                                        value={item.scoreMax}
                                        onChange={(e) => handleScoreMaxChange(index, Number(e.target.value))}
                                        placeholder="Enter score max"
                                        className="w-32"
                                    />
                                )}
                                {!item.hasScore && (
                                    <Textarea
                                        value={item.description || ''}
                                        onChange={(e) => handleDescriptionChange(index, e.target.value)}
                                        placeholder="Enter description (visible to all students)"
                                        rows={2}
                                        className="w-full mt-2"
                                    />
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
