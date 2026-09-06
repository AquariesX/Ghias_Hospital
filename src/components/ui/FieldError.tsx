interface FieldErrorProps {
  name: string;
  errors?: Record<string, string[]>;
}

export default function FieldError({ name, errors }: FieldErrorProps) {
  if (!errors) return null;
  const errs = errors[name];
  if (!errs?.length) return null;
  return <p className="text-xs text-rose-600 mt-1">{errs[0]}</p>;
}
