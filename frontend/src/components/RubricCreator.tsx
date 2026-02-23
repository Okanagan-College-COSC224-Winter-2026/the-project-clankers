import { useState, useEffect } from 'react';
import Button from './Button';
import StatusMessage from './StatusMessage';
import { createCriteria, createRubric, getRubric, getCriteria, deleteCriteria } from '../util/api';
import './RubricCreator.css';

interface RubricCreatorProps {
    onRubricCreated?: (rubricId: number) => void;
    id: number;
}

export default function RubricCreator({ onRubricCreated, id }: RubricCreatorProps) {
    const [newCriteria, setNewCriteria] = useState<Criterion[]>([{ rubricID: 0, question: '', scoreMax: 0, hasScore: true }]);
    const [canComment, setCanComment] = useState(false);
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
                    setCanComment(rubricResp.canComment || false);
                    
                    // Load existing criteria
                    const criteriaResp = await getCriteria(rubricResp.id);
                    if (criteriaResp && criteriaResp.length > 0) {
                        setExistingCriteria(criteriaResp);
                        setNewCriteria([]); // Clear new criteria if we have existing ones
                    }
                }
            } catch (error) {
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
                const rubricResponse = await createRubric(id, id, canComment);
                targetRubricId = rubricResponse.id;
                setRubricId(targetRubricId);
            }
            
            // Only create criteria for NEW entries (not existing ones)
            if (newCriteria.length > 0 && newCriteria[0].question !== '') {
                await Promise.all(newCriteria.map(({ question, scoreMax, hasScore }) => 
                    createCriteria(targetRubricId, question, scoreMax, canComment, hasScore)
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

    const handleAddNewSection = () => setNewCriteria(prev => [...prev, { rubricID: 0, question: '', scoreMax: 0, hasScore: true }]);

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
        <div className="RubricCreator">
            <h2>{rubricId ? 'Manage Rubric Criteria' : 'Create New Rubric'}</h2>

            <StatusMessage message={statusMessage} type={statusType} />

            {isLoading ? (
                <p>Loading rubric...</p>
            ) : (
                <>
                    <label className="comment-checkbox">
                        Reviewer can comment:
                        <input
                            type="checkbox"
                            checked={canComment}
                            onChange={() => setCanComment(prev => !prev)}
                        />
                    </label>

                    {/* Show existing criteria */}
                    {existingCriteria.length > 0 && (
                        <div className="existing-criteria-section">
                            <h3>Existing Criteria</h3>
                            {existingCriteria.map((item, index) => (
                                <div key={item.id || index} className="criteria-display-section">
                                    <div className="criteria-display-content">
                                        <strong>{item.question}</strong>
                                        {item.hasScore && <span> (Max score: {item.scoreMax})</span>}
                                        {!item.hasScore && <span> (Comment only)</span>}
                                    </div>
                                    <div className="delete-button-wrapper">
                                        <Button 
                                            onClick={() => handleDeleteExistingCriteria(item.id!)}
                                            type="secondary"
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add new criteria */}
                    <h3>{rubricId ? 'Add More Criteria' : 'Create Criteria'}</h3>
                    {newCriteria.map((item, index) => (
                        <div key={index} className="criteria-input-section">
                            <input
                                type="text"
                                value={item.question}
                                onChange={(e) => handleQuestionChange(index, e.target.value)}
                                placeholder="Enter question"
                            />
                            <label>
                                Has score:
                                <input
                                    type="checkbox"
                                    checked={item.hasScore}
                                    onChange={(e) => handleHasScoreChange(index, e.target.checked)}
                                />
                            </label>
                            {item.hasScore && (
                                <input
                                    type="number"
                                    min="0"
                                    value={item.scoreMax}
                                    onChange={(e) => handleScoreMaxChange(index, Number(e.target.value))}
                                    placeholder="Enter score max"
                                />
                            )}
                            <Button onClick={() => handleRemoveSection(index)}>Remove</Button>
                        </div>
                    ))}

                    <div className="button-group">
                        <Button onClick={handleAddNewSection}>Add New Criterion</Button>
                        <div className="primary-button-wrapper">
                            <Button onClick={handleCreate}>
                                {rubricId ? 'Save Changes' : 'Create Rubric'}
                            </Button>
                        </div>
                    </div>

                    <p className="help-text">
                        ⚠️ Click "{rubricId ? 'Save Changes' : 'Create Rubric'}" to save your criteria to the database.
                    </p>
                </>
            )}
        </div>
    );
} 