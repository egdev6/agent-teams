import React, { CSSProperties } from 'react';
import { theme } from '../theme';

interface StepperProps {
  currentStep: number;
  steps: Array<{
    title: string;
    description: string;
  }>;
  style?: CSSProperties;
}

export const Stepper: React.FC<StepperProps> = ({ currentStep, steps, style }) => {
  return (
    <div
      style={{
        display: 'flex',
        gap: theme.spacing.xl,
        marginBottom: '40px',
        ...style,
      }}
    >
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isActive = currentStep === stepNumber;
        const isCompleted = currentStep > stepNumber;

        return (
          <div
            key={stepNumber}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.md,
              padding: '12px 16px',
              background: isActive
                ? 'rgba(37, 99, 235, 0.1)'
                : isCompleted
                ? 'rgba(16, 185, 129, 0.1)'
                : theme.colors.background.secondary,
              border: `1px solid ${
                isActive
                  ? theme.colors.accent.blue
                  : isCompleted
                  ? theme.colors.status.success
                  : theme.colors.border.primary
              }`,
              borderRadius: theme.borderRadius.md,
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: theme.borderRadius.full,
                background: isActive
                  ? theme.colors.accent.blue
                  : isCompleted
                  ? theme.colors.status.success
                  : '#1a1f3a',
                color: isActive || isCompleted ? '#fff' : theme.colors.text.tertiary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '14px',
              }}
            >
              {isCompleted ? '✓' : stepNumber}
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: theme.colors.text.primary }}>
                {step.title}
              </div>
              <div style={{ fontSize: '11px', color: theme.colors.text.tertiary }}>
                {step.description}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
