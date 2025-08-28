import { FormErrorMessage } from "./error-message";

interface ValidationErrorProps {
  errors: Record<string, any>;
  fieldName: string;
  testId?: string;
}

export function ValidationError({ errors, fieldName, testId }: ValidationErrorProps) {
  const error = errors[fieldName];
  if (!error) return null;
  
  return (
    <FormErrorMessage 
      message={error.message} 
      data-testid={testId || `error-${fieldName}`}
    />
  );
}

interface FormFieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
  required?: boolean;
  testId?: string;
}

export function FormField({ label, error, children, required, testId }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && (
        <FormErrorMessage 
          message={error} 
          data-testid={testId || `error-${label.toLowerCase().replace(/\s+/g, '-')}`}
        />
      )}
    </div>
  );
}