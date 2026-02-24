import { vscode } from '@lib/vscode';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type HostMessage = { type: 'createAgentResult'; success: boolean; error?: string };

export const useCreateAgentLogic = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [role, setRole] = useState<string>('');
  const [description, setDescription] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    const onMessage = (event: MessageEvent<HostMessage>) => {
      const message = event.data;
      if (message.type === 'createAgentResult') {
        setIsSaving(false);
        if (message.success) {
          navigate('/');
        } else {
          setCreateError(message.error ?? 'Failed to create agent');
        }
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [navigate]);

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills((prev) => [...prev, trimmed]);
    }
    setSkillInput('');
  };

  const removeSkill = (skill: string) => setSkills((prev) => prev.filter((item) => item !== skill));

  const handleCreate = () => {
    setCreateError(null);
    setIsSaving(true);
    vscode.postMessage({
      type: 'createAgent',
      name,
      role: role || undefined,
      description: description || undefined,
      skills: skills.length > 0 ? skills : undefined,
    });
  };

  return {
    navigate,
    name,
    setName,
    role,
    setRole,
    description,
    setDescription,
    skillInput,
    setSkillInput,
    skills,
    isSaving,
    createError,
    addSkill,
    removeSkill,
    handleCreate,
    isValid: name.trim().length > 0,
  };
};
