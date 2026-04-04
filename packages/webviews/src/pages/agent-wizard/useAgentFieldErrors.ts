import { useEffect, useRef, useState } from 'react';
import { isAgentRole } from './constants';

export type AgentFieldErrors = {
  name?: string;
  description?: string;
  role?: string;
  intents?: string;
  workflowSteps?: string;
};

type ValidatedValues = {
  name: string;
  description: string;
  role: string;
  intents: string[];
  workflowSteps: string[];
};

function validate(values: ValidatedValues): AgentFieldErrors {
  const errors: AgentFieldErrors = {};
  const trimName = values.name.trim();
  if (trimName.length === 0) {
    errors.name = 'Agent name is required.';
  } else if (trimName.length < 3) {
    errors.name = `Name is too short — minimum 3 characters (${trimName.length} entered).`;
  } else if (trimName.length > 80) {
    errors.name = `Name is too long — maximum 80 characters (${trimName.length} entered).`;
  }

  const trimDesc = values.description.trim();
  if (trimDesc.length === 0) {
    errors.description = 'Description is required.';
  } else if (trimDesc.length < 10) {
    errors.description = `Description is too short — minimum 10 characters (${trimDesc.length} entered).`;
  } else if (trimDesc.length > 600) {
    errors.description = `Description is too long — maximum 600 characters (${trimDesc.length} entered).`;
  }

  if (!values.role) {
    errors.role = 'Please select a role.';
  } else if (!isAgentRole(values.role)) {
    errors.role = `"${values.role}" is not a valid role.`;
  }

  if (values.role !== 'router' && values.intents.length === 0) {
    errors.intents = 'Add at least one intent (used for routing).';
  }

  return errors;
}

/**
 * Returns per-field validation errors for the agent wizard fields, with a
 * 300 ms debounce so errors appear as the user pauses typing rather than
 * on every key-stroke.
 */
export function useAgentFieldErrors(values: ValidatedValues): AgentFieldErrors {
  const [errors, setErrors] = useState<AgentFieldErrors>(() => validate(values));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setErrors(validate(values));
      timer.current = null;
    }, 300);
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.name, values.description, values.role, values.intents, values.workflowSteps, values]);

  return errors;
}
