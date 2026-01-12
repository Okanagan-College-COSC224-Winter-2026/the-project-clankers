import { useEffect, useState } from 'react';
import Criteria from './Criteria';
import { getCriteria, getRubric } from '../util/api';
import './RubricDisplay.css';

interface RubricDisplayProps {
    rubricId: number | null;
    onCriterionSelect: (row: number, column: number) => void;
    grades: number[];
}

interface RubricInfo {
    id: number;
    assignmentID: number;
    canComment: boolean;
    grades: number[];
}

export default function RubricDisplay({ rubricId, onCriterionSelect, grades }: RubricDisplayProps) {
    const [criteria, setCriteria] = useState<Criterion[]>([]);
    const [rubricInfo, setRubricInfo] = useState<RubricInfo | null>(null);
    const questions: string[] = [];
    const scoreMaxes: number[] = [];
    const hasScores: boolean[] = [];

    useEffect(() => {
        const loadData = async () => {
            if (rubricId) {
                const [criteriaResp, rubricResp] = await Promise.all([
                    getCriteria(rubricId),
                    getRubric(rubricId)
                ]);
                setCriteria(criteriaResp);
                setRubricInfo(rubricResp);
            }
        };
        loadData();
    }, [rubricId]);

    criteria.forEach((crit) => {
        questions.push(crit.question);
        scoreMaxes.push(crit.scoreMax);
        hasScores.push(crit.hasScore);
    });

    if (!rubricId || criteria.length === 0) {
        return (
            <div className="RubricDisplay">
                <p>No rubric available yet</p>
            </div>
        );
    }

    return (
        <div className="RubricDisplay">
            <h2>Rubric</h2>
            <Criteria
                questions={questions}
                scoreMaxes={scoreMaxes}
                canComment={rubricInfo?.canComment ?? false}
                hasScores={hasScores}
                onCriterionSelect={onCriterionSelect}
                grades={grades}
            />
        </div>
    );
} 