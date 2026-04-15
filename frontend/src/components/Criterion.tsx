import { useState } from 'react';

//Component for a single row of the criteria table
interface props {
    question: string;
    scoreMax: number;
    hasScore: boolean;
    description?: string;
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

    // Use compact mode for scores > 10
    const useCompactMode = props.hasScore && props.scoreMax > 10;

    return (
        <tr className='min-h-[100px] flex'>
            <th className='bg-muted text-center p-2 text-sm font-bold w-[250px] min-w-[250px] max-w-[250px] border border-black'>{props.question}</th>
            {props.hasScore ? (
                useCompactMode ? (
                    // Compact mode: show score max in subtle box
                    <td className='flex-grow p-2 border border-black flex items-center justify-center gap-4'>
                        <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded text-gray-700 font-medium text-sm">
                            Max Score: {props.scoreMax}
                        </div>
                        {props.grade && (
                            <span className="px-3 py-1 bg-green-300 rounded font-semibold text-sm">
                                Selected: {props.grade}
                            </span>
                        )}
                    </td>
                ) : (
                    // Original mode: show individual cells for scores <= 10
                    Array.from({ length: props.scoreMax }, (_, i) => {
                        const cellValue = i + 1;
                        const isReviewed = cellValue === props.grade;
                        return (
                            <td
                                key={i}
                                onClick={() => handleCellClick(i)}
                                className={`flex-grow text-center p-2 border border-black break-words cursor-pointer ${isReviewed ? 'bg-green-300' : (clickedCell === cellValue ? 'bg-yellow-300' : '')}`}
                            >
                                {cellValue}
                            </td>
                        );
                    })
                )
            ) : (
                <td className='flex-grow text-center p-2 border border-black break-words'>
                    <div className='break-words whitespace-normal max-w-full'>{props.description || ''}</div>
                </td>
            )}
        </tr>
    )
}
