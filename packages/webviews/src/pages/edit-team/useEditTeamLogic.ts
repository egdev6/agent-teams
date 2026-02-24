import { vscode } from '@lib/vscode';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export const useEditTeamLogic = () => {
  const navigate = useNavigate();
  const { teamId } = useParams<{ teamId: string }>();
  const [name, setName] = useState(teamId ?? '');
  const [description, setDescription] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const toggleAgent = (id: string) =>
    setSelectedAgents((prev) =>
      prev.includes(id) ? prev.filter((agent) => agent !== id) : [...prev, id],
    );

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => setTags((prev) => prev.filter((item) => item !== tag));

  const handleSave = () => {
    vscode.postMessage({
      type: 'saveTeam',
      teamId,
      name,
      description,
      agents: selectedAgents,
      tags,
    } as any);
  };

  const handleDelete = () => {
    vscode.postMessage({ type: 'deleteTeam', teamId } as any);
    navigate(-1);
  };

  return {
    navigate,
    name,
    setName,
    description,
    setDescription,
    selectedAgents,
    tagInput,
    setTagInput,
    tags,
    toggleAgent,
    addTag,
    removeTag,
    handleSave,
    handleDelete,
    isValid: name.trim().length > 0,
  };
};
