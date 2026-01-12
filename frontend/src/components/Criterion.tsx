import './Criterion.css';
import { useState } from 'react';

//Component for a single row of the criteria table
interface props {
    question: string;
    scoreMax: number;
    hasScore: boolean;
    onCriterionSelect: (row: number, column: number) => void;
    questionIndex: number;
    grade: number;
}

export default function Criterion(props: props) {
    const [clickedCell, setClickedCell] = useState<number | null>(null);
    
    const handleCellClick = (columnIndex: number) => {
        const column = columnIndex + 1; 
        
        // Toggle selection: if same cell is clicked again, deselect it
        if (clickedCell === column) {
            setClickedCell(null);
            // Inform parent component about deselection
            props.onCriterionSelect(props.questionIndex, column);
        } else {
            setClickedCell(column);
            // Inform parent component about new selection
            props.onCriterionSelect(props.questionIndex, column);
        }
    }

    return (
        <tr className='criterionRow'>
            <th className='criterionHead'>{props.question}</th>
            {props.hasScore ? (
                Array.from({ length: props.scoreMax }, (_, i) => {
                    const cellValue = i + 1; 
                    const isReviewed = cellValue === props.grade; 
                    return (
                        <td 
                            key={i} 
                            onClick={() => handleCellClick(i)}
                            className={isReviewed ? 'reviewedCell' : (clickedCell === cellValue ? 'clickedCell' : '')}
                        >
                            {cellValue}
                        </td>
                    );
                })
            ) : (
                <td className='criterionData'>
                    <textarea className='comment' placeholder='Comment here'/>
                </td>
            )}
        </tr>
    )
}
