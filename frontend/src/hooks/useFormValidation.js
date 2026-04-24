import { useState, useCallback } from 'react';

const validators = {
  required: (value) => (!value || !String(value).trim()) ? 'This field is required' : null,
  email: (value) => {
    if (!value) return null;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'Invalid email address';
  },
  minLength: (min) => (value) => {
    if (!value) return null;
    return value.length >= min ? null : `Must be at least ${min} characters`;
  },
  match: (fieldName, fieldLabel) => (value, allValues) => {
    if (!value) return null;
    return value === allValues[fieldName] ? null : `Must match ${fieldLabel || fieldName}`;
  },
};

export default function useFormValidation(rules) {
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validateField = useCallback((name, value, allValues) => {
    const fieldRules = rules[name];
    if (!fieldRules) return null;
    for (const rule of fieldRules) {
      const error = rule(value, allValues);
      if (error) return error;
    }
    return null;
  }, [rules]);

  const handleBlur = useCallback((name, value, allValues) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, value, allValues);
    setErrors(prev => ({ ...prev, [name]: error }));
  }, [validateField]);

  const validateAll = useCallback((values) => {
    const newErrors = {};
    let valid = true;
    for (const name of Object.keys(rules)) {
      const error = validateField(name, values[name], values);
      if (error) {
        newErrors[name] = error;
        valid = false;
      }
    }
    setErrors(newErrors);
    setTouched(Object.keys(rules).reduce((acc, k) => ({ ...acc, [k]: true }), {}));
    return valid;
  }, [rules, validateField]);

  const clearErrors = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  const getFieldError = useCallback((name) => {
    return touched[name] ? errors[name] : null;
  }, [errors, touched]);

  return { errors, touched, handleBlur, validateAll, clearErrors, getFieldError };
}

export { validators };
