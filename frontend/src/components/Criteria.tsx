import Criterion from '../components/Criterion';

interface props {
    questions: Array<string>;
    scoreMaxes: Array<number>;
    canComment: boolean;
    hasScores: Array<boolean>;
    descriptions?: Array<string>;
    onCriterionSelect: (row: number, column: number) => void;
    grades: number[];
}

export default function Criteria(props: props) {
    return (
        <div className="flex flex-col items-center justify-center mt-5">
            <table className='text-center w-full max-w-[700px] border border-black border-collapse'>
                <tbody>
                {props.questions.map((question, i) => (
                    <Criterion
                        key={i}
                        question={question}
                        scoreMax={props.scoreMaxes[i]}
                        hasScore={props.hasScores[i]}
                        description={props.descriptions?.[i]}
                        onCriterionSelect={props.onCriterionSelect}
                        questionIndex={i}
                        grade={props.grades[i]}
                    />
                ))}
                </tbody>
            </table>
            {props.canComment &&
            <textarea className="w-full min-h-[80px] resize-y p-1 border border-gray-300 rounded bg-background" />}
        </div>
    )
}
