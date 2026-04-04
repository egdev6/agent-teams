/**
 * SyncStatusCard unit tests
 * Tests for Task 4.2: Refactored to accept hook status values
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SyncStatusCard } from './SyncStatusCard';

describe('SyncStatusCard - Hook Status Integration', () => {
  const defaultProps = {
    syncTime: '2 minutes ago',
    syncEnabled: true,
    onSync: vi.fn(),
  };

  // Test 1: 'idle' status -> displays "Never synced"
  it('displays "Never synced" for idle status', () => {
    render(<SyncStatusCard {...defaultProps} status='idle' />);

    expect(screen.getByText('Never synced')).toBeInTheDocument();
    expect(
      screen.getByText('Agent files have never been synced to target directories'),
    ).toBeInTheDocument();
  });

  // Test 2: 'checking' status -> displays "Checking for changes" with spinner
  it('displays "Checking for changes" for checking status', () => {
    render(<SyncStatusCard {...defaultProps} status='checking' />);

    expect(screen.getByText('Checking for changes')).toBeInTheDocument();
    expect(screen.getByText('Verifying current sync status...')).toBeInTheDocument();
  });

  // Test 3: 'needs_sync' status -> displays "Sync needed"
  it('displays "Sync needed" for needs_sync status', () => {
    const pendingChanges = {
      created: 2,
      updated: 1,
      deleted: 0,
      skipped: 0,
      total: 3,
      items: [
        { id: 'agent-a', action: 'create' as const },
        { id: 'agent-b', action: 'create' as const },
        { id: 'agent-c', action: 'update' as const },
      ],
    };

    render(
      <SyncStatusCard {...defaultProps} status='needs_sync' pendingChanges={pendingChanges} />,
    );

    expect(screen.getByText('Sync needed')).toBeInTheDocument();
    expect(screen.getByText('2 new, 1 updated — changes pending sync')).toBeInTheDocument();
    expect(screen.getByText('3 pending')).toBeInTheDocument();
  });

  // Test 4: 'up_to_date' status -> displays "Up to date"
  it('displays "Up to date" for up_to_date status', () => {
    render(<SyncStatusCard {...defaultProps} status='up_to_date' />);

    expect(screen.getByText('Up to date')).toBeInTheDocument();
    expect(screen.getByText('Last synced 2 minutes ago')).toBeInTheDocument();
  });

  // Test 5: 'syncing' status -> displays "Checking for changes" (transitional state)
  it('displays "Checking for changes" for syncing status', () => {
    render(<SyncStatusCard {...defaultProps} status='syncing' syncing={true} />);

    expect(screen.getByText('Checking for changes')).toBeInTheDocument();
  });

  // Test 6: 'error' status -> displays "Sync failed" with error message
  it('displays "Sync failed" for error status with error message', () => {
    render(<SyncStatusCard {...defaultProps} status='error' syncError='Network timeout' />);

    expect(screen.getByText('Sync failed')).toBeInTheDocument();
    expect(screen.getByText('Network timeout')).toBeInTheDocument();
  });

  // Test 7: validation_error status -> displays validation error details
  it('displays validation error details for validation_error status', () => {
    render(
      <SyncStatusCard
        {...defaultProps}
        status='validation_error'
        syncError='Failed to compose agent "test-agent": Invalid YAML'
      />,
    );

    expect(screen.getByText('Validation error')).toBeInTheDocument();
    expect(screen.getByText('Agent validation failed')).toBeInTheDocument();
    expect(screen.getByText('test-agent')).toBeInTheDocument();
    expect(screen.getByText('Invalid YAML')).toBeInTheDocument();
  });

  // Test 8: Sync button appears for needs_sync
  it('shows sync button for needs_sync status', () => {
    const pendingChanges = {
      created: 1,
      updated: 0,
      deleted: 0,
      skipped: 0,
      total: 1,
      items: [{ id: 'agent-a', action: 'create' as const }],
    };

    render(
      <SyncStatusCard {...defaultProps} status='needs_sync' pendingChanges={pendingChanges} />,
    );

    expect(screen.getByRole('button', { name: /Sync Now/i })).toBeInTheDocument();
  });

  // Test 9: Sync button appears for idle (never synced)
  it('shows sync button for idle status', () => {
    render(<SyncStatusCard {...defaultProps} status='idle' />);

    // Button should be present but disabled (no pendingChanges)
    const button = screen.getByRole('button', { name: /Loading/i });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  // Test 10: Sync button shows retry for error status
  it('shows retry button for error status', () => {
    render(<SyncStatusCard {...defaultProps} status='error' syncError='Sync failed' />);

    expect(screen.getByRole('button', { name: /Loading/i })).toBeInTheDocument();
  });

  // Test 11: No sync button for up_to_date status
  it('does not show sync button for up_to_date status', () => {
    render(<SyncStatusCard {...defaultProps} status='up_to_date' />);

    expect(screen.queryByRole('button', { name: /Sync/i })).not.toBeInTheDocument();
  });

  // Test 12: No sync button for checking status
  it('does not show sync button for checking status', () => {
    render(<SyncStatusCard {...defaultProps} status='checking' />);

    expect(screen.queryByRole('button', { name: /Sync/i })).not.toBeInTheDocument();
  });
});
