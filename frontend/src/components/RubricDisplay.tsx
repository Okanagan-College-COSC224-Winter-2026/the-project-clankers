import { useEffect, useState } from 'react';
import Criteria from './Criteria';
import { getCriteria, getRubric } from '../util/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
    const descriptions: string[] = [];

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
        descriptions.push(crit.description || '');
    });

    if (!rubricId || criteria.length === 0) {
        return (
            <Card className="my-5">
                <CardContent className="pt-6">
                    <p>No rubric available yet</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="my-5">
            <CardHeader>
                <CardTitle>Rubric</CardTitle>
            </CardHeader>
            <CardContent>
                <Criteria
                    questions={questions}
                    scoreMaxes={scoreMaxes}
                    canComment={rubricInfo?.canComment ?? false}
                    hasScores={hasScores}
                    descriptions={descriptions}
                    onCriterionSelect={onCriterionSelect}
                    grades={grades}
                />
            </CardContent>
        </Card>
    );
}
