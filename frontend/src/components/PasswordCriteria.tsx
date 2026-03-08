import './PasswordCriteria.css';

interface Props {
  password: string;
}

interface CriteriaItem {
  label: string;
  test: (password: string) => boolean;
}

const criteria: CriteriaItem[] = [
  { label: 'At least 8 characters', test: (pwd) => pwd.length >= 8 },
  { label: 'Contains uppercase letter', test: (pwd) => /[A-Z]/.test(pwd) },
  { label: 'Contains lowercase letter', test: (pwd) => /[a-z]/.test(pwd) },
  { label: 'Contains number', test: (pwd) => /\d/.test(pwd) },
  { label: 'Contains special character (!@#$%^&*)', test: (pwd) => /[!@#$%^&*]/.test(pwd) }
];

export default function PasswordCriteria(props: Props) {
  return (
    <div className="PasswordCriteria">
      <p className="PasswordCriteriaTitle">Password must contain:</p>
      <ul className="PasswordCriteriaList">
        {criteria.map((item, index) => {
          const isMet = item.test(props.password);
          return (
            <li
              key={index}
              className={`PasswordCriteriaItem ${isMet ? 'met' : 'unmet'}`}
            >
              <span className="PasswordCriteriaIcon">
                {isMet ? '✓' : '○'}
              </span>
              <span className="PasswordCriteriaLabel">{item.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
