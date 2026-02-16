import React from 'react';
import { theme } from '../theme';
import { DashboardStats, Agent, MessageType } from '../types';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { Stepper } from '../components/Stepper';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';

interface DashboardProps {
  stats: DashboardStats;
  onMessage: (message: MessageType) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ stats, onMessage }) => {
  const currentStep = stats.hasProfile
    ? stats.totalAgents > 0
      ? stats.syncStatus === 'SUCCESS'
        ? 4
        : 3
      : 2
    : 1;

  const sidebarSections = [
    {
      title: 'Project',
      items: [
        { icon: '⚙️', label: 'Profile', onClick: () => onMessage({ type: 'initProject' }) },
        { icon: '📦', label: 'Context Packs' },
      ],
    },
    {
      title: 'Teams',
      items: [
        { icon: '👥', label: 'Current Team' },
        { icon: '📚', label: 'Teams Library', onClick: () => onMessage({ type: 'browseKits' }) },
      ],
    },
    {
      title: 'Agents',
      items: [{ icon: '🤖', label: 'Agents Library', active: true }],
    },
    {
      title: 'Deploy',
      items: [
        { icon: '✓', label: 'Validate', onClick: () => onMessage({ type: 'refresh' }) },
        { icon: '🔄', label: 'Sync', onClick: () => onMessage({ type: 'syncAgents' }) },
        { icon: '↻', label: 'Reload', onClick: () => onMessage({ type: 'refresh' }) },
      ],
    },
  ];

  const topBarStatusItems = [
    {
      label: 'Project Profile',
      value: stats.hasProfile ? 'Configured' : 'Not Configured',
      status: stats.hasProfile ? ('success' as const) : ('error' as const),
    },
    {
      label: 'Active Team',
      value: stats.totalAgents > 0 ? `${stats.totalAgents} Agents` : 'None',
    },
    {
      label: 'Sync Status',
      value: stats.syncStatus === 'SUCCESS' ? 'Synced' : 'Out of sync',
      status: stats.syncStatus === 'SUCCESS' ? ('success' as const) : ('warning' as const),
    },
  ];

  const topBarActions = [
    ...(stats.hasProfile
      ? []
      : [
          {
            label: 'Edit Profile',
            onClick: () => onMessage({ type: 'initProject' }),
            variant: 'primary' as const,
          },
        ]),
    { label: 'Switch Team', onClick: () => onMessage({ type: 'openChat' }), variant: 'secondary' as const },
    { label: 'Sync Now', onClick: () => onMessage({ type: 'syncAgents' }), variant: 'primary' as const },
  ];

  const steps = [
    { title: 'Configure Profile', description: 'Project setup' },
    { title: 'Select Team', description: currentStep >= 2 ? 'Pending' : 'Pending' },
    { title: 'Generate Agents', description: stats.totalAgents > 0 ? 'Created' : 'Pending' },
    { title: 'Ready', description: 'Locked' },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', background: theme.colors.background.primary }}>
      <Sidebar sections={sidebarSections} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <TopBar statusItems={topBarStatusItems} actions={topBarActions} />

        <div style={{ flex: 1, overflowY: 'auto', padding: '30px' }}>
          <Stepper currentStep={currentStep} steps={steps} />

          {!stats.hasProfile && <HeroSection onInit={() => onMessage({ type: 'initProject' })} />}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
            <StatCard
              icon="👥"
              title="Total Agents"
              value={stats.totalAgents}
              label="Active"
              badge={stats.totalAgents > 0 ? { text: `+${stats.totalAgents}`, variant: 'success' } : undefined}
            />
            <StatCard
              icon="🛡️"
              title="Specs Validated"
              value={`${stats.specCount > 0 ? Math.round((stats.validSpecs / stats.specCount) * 100) : 100}%`}
              label={`(${stats.validSpecs}/${stats.specCount})`}
              badge={{
                text: 'Validated',
                variant: stats.specCount === stats.validSpecs ? 'success' : 'warning',
              }}
            />
            <StatCard
              icon={stats.syncStatus === 'SUCCESS' ? '✓' : '⚠️'}
              title="GitHub Sync"
              value={stats.syncStatus === 'SUCCESS' ? 'Sincronizado' : 'Desincronizado'}
              label={stats.syncTime}
              badge={{
                text: stats.syncStatus === 'SUCCESS' ? 'SUCCESS' : 'AVISO',
                variant: stats.syncStatus === 'SUCCESS' ? 'success' : 'warning',
              }}
            />
          </div>

          {stats.totalAgents > 0 ? (
            <AgentsTable agents={stats.agents} onMessage={onMessage} />
          ) : stats.hasProfile ? (
            <EmptyState onCreate={() => onMessage({ type: 'createAgent' })} />
          ) : null}
        </div>
      </div>
    </div>
  );
};

const HeroSection: React.FC<{ onInit: () => void }> = ({ onInit }) => (
  <div
    style={{
      textAlign: 'center',
      padding: '80px 20px',
      background: 'linear-gradient(135deg, #0f1535 0%, #1a1f3a 100%)',
      border: `1px solid ${theme.colors.border.primary}`,
      borderRadius: theme.borderRadius.xl,
      marginBottom: '30px',
    }}
  >
    <div
      style={{
        width: '80px',
        height: '80px',
        background: 'rgba(37, 99, 235, 0.2)',
        borderRadius: theme.borderRadius.full,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 24px',
        fontSize: '36px',
      }}
    >
      ⚙️
    </div>
    <div style={{ fontSize: '28px', fontWeight: 700, marginBottom: '12px' }}>Let's set up your Project</div>
    <div style={{ fontSize: '15px', color: theme.colors.text.secondary, marginBottom: '32px' }}>
      Initialize your project profile to unlock team selection, agent generation, and GitHub integration features.
    </div>
    <Button onClick={onInit} variant="primary" style={{ padding: '14px 32px', fontSize: '15px' }}>
      🚀 Inicializar Proyecto
    </Button>
  </div>
);

const AgentsTable: React.FC<{ agents: Agent[]; onMessage: (msg: MessageType) => void }> = ({ agents, onMessage }) => (
  <div
    style={{
      background: theme.colors.background.secondary,
      border: `1px solid ${theme.colors.border.primary}`,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.xxl,
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: theme.spacing.xxl }}>
      <div style={{ fontSize: '18px', fontWeight: 700 }}>Active Agents</div>
      <div>Showing {agents.length} of {agents.length} agents</div>
    </div>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={tableHeaderStyle}>Agent Name</th>
          <th style={tableHeaderStyle}>Role</th>
          <th style={tableHeaderStyle}>Status</th>
          <th style={tableHeaderStyle}>Last Modified</th>
          <th style={tableHeaderStyle}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {agents.map((agent) => (
          <tr key={agent.id} style={{ borderBottom: `1px solid ${theme.colors.border.primary}` }}>
            <td style={tableCellStyle}>{agent.name}</td>
            <td style={tableCellStyle}>
              <Badge variant={agent.role}>{agent.role}</Badge>
            </td>
            <td style={tableCellStyle}>Active</td>
            <td style={tableCellStyle}>{agent.lastModified}</td>
            <td style={tableCellStyle}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <Button size="small" variant="secondary" onClick={() => onMessage({ type: 'viewSpec', agentId: agent.id })}>
                  📋
                </Button>
                <Button size="small" variant="secondary" onClick={() => onMessage({ type: 'editAgent', agentId: agent.id })}>
                  ✏️
                </Button>
                <Button size="small" variant="secondary" onClick={() => onMessage({ type: 'deleteAgent', agentId: agent.id })}>
                  🗑️
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const EmptyState: React.FC<{ onCreate: () => void }> = ({ onCreate }) => (
  <div
    style={{
      background: theme.colors.background.secondary,
      border: `1px solid ${theme.colors.border.primary}`,
      borderRadius: theme.borderRadius.lg,
      textAlign: 'center',
      padding: '60px',
    }}
  >
    <div style={{ fontSize: '48px', opacity: 0.4, marginBottom: '16px' }}>👥</div>
    <div style={{ fontSize: '16px', fontWeight: 600, color: theme.colors.text.secondary, marginBottom: '8px' }}>
      No agents created yet
    </div>
    <div style={{ fontSize: '13px', color: theme.colors.text.tertiary, marginBottom: '20px' }}>
      Create your first agent to get started!
    </div>
    <Button onClick={onCreate} variant="primary">
      Create New Agent
    </Button>
  </div>
);

const tableHeaderStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '12px',
  fontSize: '11px',
  fontWeight: 700,
  color: theme.colors.text.tertiary,
  textTransform: 'uppercase',
  borderBottom: `1px solid ${theme.colors.border.primary}`,
};

const tableCellStyle: React.CSSProperties = {
  padding: '16px 12px',
  borderBottom: `1px solid ${theme.colors.border.primary}`,
};
