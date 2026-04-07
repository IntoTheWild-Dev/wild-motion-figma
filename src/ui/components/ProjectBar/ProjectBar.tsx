// src/ui/components/ProjectBar/ProjectBar.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useAnimationStore } from '@/ui/store/animationStore';

interface ProjectBarProps {
  onHome?: () => void;
}

const ProjectBar: React.FC<ProjectBarProps> = ({ onHome }) => {
  const { projects, activeProjectId, createProject, switchToProject, renameProject, deleteProject } =
    useAnimationStore(state => ({
      projects: state.projects,
      activeProjectId: state.activeProjectId,
      createProject: state.createProject,
      switchToProject: state.switchToProject,
      renameProject: state.renameProject,
      deleteProject: state.deleteProject,
    }));

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Focus the input when editing starts
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const startRename = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const commitRename = () => {
    if (editingId) {
      const trimmed = editingName.trim();
      if (trimmed) renameProject(editingId, trimmed);
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitRename();
    if (e.key === 'Escape') { setEditingId(null); setEditingName(''); }
  };

  const handleCreateProject = () => {
    createProject('Untitled');
  };

  return (
    <div className="flex items-center gap-0 border-b border-wm-border bg-wm-surface flex-shrink-0 overflow-x-auto"
      style={{ height: 32, minHeight: 32 }}>
      {/* Home button */}
      {onHome && (
        <button
          onClick={onHome}
          className="flex-shrink-0 flex items-center justify-center w-7 h-full text-wm-muted hover:text-wm-text hover:bg-wm-bg/50 border-r border-wm-border transition-colors"
          title="All projects"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M1 5.5L5.5 1L10 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2.5 4V9.5H4.5V7H6.5V9.5H8.5V4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
      {projects.map(project => (
        <div
          key={project.id}
          className={`relative group flex items-center flex-shrink-0 h-full px-2 cursor-pointer select-none border-r border-wm-border transition-colors ${
            project.id === activeProjectId
              ? 'bg-wm-bg text-wm-text border-b-2 border-b-wm-accent -mb-px'
              : 'text-wm-muted hover:text-wm-text hover:bg-wm-bg/50'
          }`}
          onClick={() => {
            if (editingId !== project.id) switchToProject(project.id);
          }}
          onDoubleClick={() => startRename(project.id, project.name)}
          style={{ minWidth: 0, maxWidth: 120 }}
        >
          {editingId === project.id ? (
            <input
              ref={editInputRef}
              value={editingName}
              onChange={e => setEditingName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={handleRenameKeyDown}
              onClick={e => e.stopPropagation()}
              className="w-full bg-transparent text-xs text-wm-text outline-none border-none"
              style={{ minWidth: 40, maxWidth: 90 }}
            />
          ) : (
            <span className="text-xs truncate pr-3" style={{ maxWidth: 80 }}>
              {project.name}
            </span>
          )}

          {/* Delete button — only shows on hover and only if more than 1 project */}
          {projects.length > 1 && editingId !== project.id && (
            <button
              onClick={e => {
                e.stopPropagation();
                deleteProject(project.id);
              }}
              className="absolute right-0.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center rounded text-wm-muted hover:text-wm-record transition-all"
              title="Delete project"
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M1.5 1.5L6.5 6.5M6.5 1.5L1.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>
      ))}

      {/* New project button */}
      <button
        onClick={handleCreateProject}
        className="flex-shrink-0 flex items-center justify-center w-7 h-full text-wm-muted hover:text-wm-text hover:bg-wm-bg/50 transition-colors"
        title="New project"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 2V10M2 6H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
};

export default ProjectBar;
