import { useState } from 'react';
import Button from './Button';
import StatusMessage from './StatusMessage';
import { createCriteria, createRubric } from '../util/api';
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

    const handleCreate = async () => {
        try {
            setStatusMessage('');
            const rubricResponse = await createRubric(id, id, canComment);
            const newRubricID = rubricResponse.id;
            await Promise.all(newCriteria.map(({ question, scoreMax, hasScore }) => 
                createCriteria(newRubricID, question, scoreMax, canComment, hasScore)
            ));
            setStatusType('success');
            setStatusMessage('Rubric created successfully!');
            setTimeout(() => window.location.reload(), 2000);
            if (onRubricCreated) {
                onRubricCreated(newRubricID);
            }
        } catch (error) {
            console.error("Error creating criteria:", error);
            setStatusType('error');
            setStatusMessage('Error creating rubric.');
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

    return (
        <div className="RubricCreator">
            <h2>Create New Criteria</h2>

            <StatusMessage message={statusMessage} type={statusType} />

            <label className="comment-checkbox">
                Reviewer can comment:
                <input
                    type="checkbox"
                    checked={canComment}
                    onChange={() => setCanComment(prev => !prev)}
                />
            </label>

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
                    <Button onClick={() => handleRemoveSection(index)}>Remove Criterion</Button>
                </div>
            ))}

            <div className="button-group">
                <Button onClick={handleAddNewSection}>Add New Criterion</Button>
                <Button onClick={handleCreate}>Create</Button>
            </div>
        </div>
    );
} 