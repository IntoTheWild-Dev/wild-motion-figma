// src/ui/components/HomeScreen/HomeScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useAnimationStore } from '@/ui/store/animationStore';
import type { ProjectSnapshot, Folder } from '@/types/animation.types';

interface HomeScreenProps {
  onOpen: () => void;
}

// ─── Small reusable helpers ───────────────────────────────────────────────────

const IconFolder = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M1 3a1 1 0 011-1h2.5l1 1H10a1 1 0 011 1v5a1 1 0 01-1 1H2a1 1 0 01-1-1V3z"
      stroke="currentColor" strokeWidth="1.2" fill="none"/>
  </svg>
);

const IconPlus = ({ size = 10 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 10 10" fill="none">
    <path d="M5 1V9M1 5H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const IconPencil = () => (
  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
    <path d="M1 7.5L2.5 7l4-4L5 1.5l-4 4L.5 7l.5.5z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/>
    <path d="M5 1.5l2 2" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
  </svg>
);

const IconX = ({ size = 8 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 8 8" fill="none">
    <path d="M1.5 1.5L6.5 6.5M6.5 1.5L1.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const IconChevron = ({ open }: { open: boolean }) => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
    style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>
    <path d="M3.5 2L7 5l-3.5 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ─── Inline rename input ──────────────────────────────────────────────────────

const InlineInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  className?: string;
}> = ({ value, onChange, onCommit, onCancel, className = '' }) => {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  return (
    <input
      ref={ref}
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={onCommit}
      onKeyDown={e => {
        if (e.key === 'Enter') onCommit();
        if (e.key === 'Escape') onCancel();
        e.stopPropagation();
      }}
      onClick={e => e.stopPropagation()}
      className={`bg-transparent border-none outline-none text-wm-text ${className}`}
    />
  );
};

// ─── Frame card ───────────────────────────────────────────────────────────────

const FrameCard: React.FC<{
  project: ProjectSnapshot;
  folders: Folder[];
  isActive: boolean;
  canDelete: boolean;
  onOpen: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onMoveToFolder: (folderId: string | null) => void;
}> = ({ project, folders, isActive, canDelete, onOpen, onRename, onDelete, onMoveToFolder }) => {
  const [renaming, setRenaming] = useState(false);
  const [renameName, setRenameName] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [folderMenuOpen, setFolderMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setFolderMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const startRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    setRenameName(project.name);
    setRenaming(true);
  };

  const commitRename = () => {
    const t = renameName.trim();
    if (t) onRename(t);
    setRenaming(false);
  };

  const layerCount = project.layers.length;
  const secs = (project.duration / project.fps).toFixed(1);

  return (
    <div
      onClick={() => { if (!renaming && !menuOpen) onOpen(); }}
      className={`group relative flex flex-col rounded-lg border cursor-pointer transition-all overflow-visible
        ${isActive
      ? 'border-wm-accent/60 bg-wm-accent/5'
      : 'border-wm-border bg-wm-surface hover:border-wm-accent/40 hover:bg-wm-panel'
    }`}
      style={{ minHeight: 86 }}
    >
      {/* Preview area */}
      <div className="flex-1 flex items-center justify-center" style={{ minHeight: 50, background: 'rgba(255,255,255,0.02)' }}>
        {layerCount > 0 ? (
          <div className="flex flex-col items-center gap-1">
            <div className="flex gap-1 items-end">
              {Array.from({ length: Math.min(layerCount, 4) }).map((_, i) => (
                <div key={i} className="rounded-sm bg-wm-accent/40"
                  style={{ width: 5, height: 5 + i * 4, opacity: 0.4 + i * 0.15 }} />
              ))}
            </div>
            <span className="text-2xs text-wm-muted">{layerCount} layer{layerCount !== 1 ? 's' : ''}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 opacity-30">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 2"/>
            </svg>
            <span className="text-2xs text-wm-muted">Empty</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-2 py-1.5 border-t border-wm-border/50 flex items-center gap-1">
        {renaming ? (
          <InlineInput
            value={renameName}
            onChange={setRenameName}
            onCommit={commitRename}
            onCancel={() => setRenaming(false)}
            className="flex-1 min-w-0 text-xs"
          />
        ) : (
          <span className="flex-1 min-w-0 text-xs text-wm-text truncate font-medium">{project.name}</span>
        )}
        <span className="text-2xs text-wm-muted flex-shrink-0">{secs}s</span>

        {/* ⋯ menu */}
        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); setFolderMenuOpen(false); }}
            className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded text-wm-muted hover:text-wm-text hover:bg-wm-bg transition-all"
            title="Frame options"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <circle cx="5" cy="1.5" r="1"/><circle cx="5" cy="5" r="1"/><circle cx="5" cy="8.5" r="1"/>
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 bottom-7 z-50 w-36 rounded border border-wm-border bg-wm-surface shadow-lg py-1 text-xs">
              <button onClick={startRename}
                className="w-full text-left px-3 py-1.5 text-wm-text hover:bg-wm-panel transition-colors flex items-center gap-2">
                <IconPencil /> Rename
              </button>

              {/* Move to folder submenu */}
              <div className="relative">
                <button
                  onClick={e => { e.stopPropagation(); setFolderMenuOpen(v => !v); }}
                  className="w-full text-left px-3 py-1.5 text-wm-text hover:bg-wm-panel transition-colors flex items-center justify-between"
                >
                  <span className="flex items-center gap-2"><IconFolder /> Move to folder</span>
                  <IconChevron open={folderMenuOpen} />
                </button>
                {folderMenuOpen && (
                  <div className="absolute right-full top-0 mr-1 w-36 rounded border border-wm-border bg-wm-surface shadow-lg py-1 text-xs">
                    {folders.length === 0 && (
                      <div className="px-3 py-1.5 text-wm-muted italic">No folders yet</div>
                    )}
                    {folders.map(f => (
                      <button key={f.id}
                        onClick={e => { e.stopPropagation(); onMoveToFolder(f.id); setMenuOpen(false); setFolderMenuOpen(false); }}
                        className={`w-full text-left px-3 py-1.5 hover:bg-wm-panel transition-colors flex items-center gap-2
                          ${project.folderId === f.id ? 'text-wm-accent' : 'text-wm-text'}`}>
                        <IconFolder /> {f.name}
                        {project.folderId === f.id && <span className="ml-auto text-wm-accent">✓</span>}
                      </button>
                    ))}
                    {project.folderId && (
                      <>
                        <div className="h-px bg-wm-border mx-2 my-1" />
                        <button
                          onClick={e => { e.stopPropagation(); onMoveToFolder(null); setMenuOpen(false); setFolderMenuOpen(false); }}
                          className="w-full text-left px-3 py-1.5 text-wm-muted hover:text-wm-text hover:bg-wm-panel transition-colors">
                          Remove from folder
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {canDelete && (
                <>
                  <div className="h-px bg-wm-border mx-2 my-1" />
                  <button
                    onClick={e => { e.stopPropagation(); onDelete(); setMenuOpen(false); }}
                    className="w-full text-left px-3 py-1.5 text-wm-record hover:bg-wm-panel transition-colors">
                    Delete frame
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Active dot */}
      {isActive && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-wm-accent" title="Last active" />}
    </div>
  );
};

// ─── Folder section ───────────────────────────────────────────────────────────

const FolderSection: React.FC<{
  folder: Folder;
  frames: ProjectSnapshot[];
  allFolders: Folder[];
  activeProjectId: string;
  totalProjectCount: number;
  onOpenFrame: (id: string) => void;
  onRenameFolder: (name: string) => void;
  onDeleteFolder: () => void;
  onAddFrame: () => void;
  onRenameFrame: (id: string, name: string) => void;
  onDeleteFrame: (id: string) => void;
  onMoveFrame: (id: string, folderId: string | null) => void;
}> = ({ folder, frames, allFolders, activeProjectId, totalProjectCount,
  onOpenFrame, onRenameFolder, onDeleteFolder, onAddFrame,
  onRenameFrame, onDeleteFrame, onMoveFrame }) => {
  const [open, setOpen] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [renameName, setRenameName] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const startRename = () => {
    setMenuOpen(false);
    setRenameName(folder.name);
    setRenaming(true);
  };

  const commitRename = () => {
    const t = renameName.trim();
    if (t) onRenameFolder(t);
    setRenaming(false);
  };

  return (
    <div className="mb-4">
      {/* Folder header */}
      <div className="flex items-center gap-1.5 px-1 py-1 group/folder">
        <button onClick={() => setOpen(v => !v)}
          className="flex-shrink-0 text-wm-muted hover:text-wm-text transition-colors">
          <IconChevron open={open} />
        </button>
        <span className="text-wm-accent flex-shrink-0"><IconFolder /></span>

        {renaming ? (
          <InlineInput
            value={renameName}
            onChange={setRenameName}
            onCommit={commitRename}
            onCancel={() => setRenaming(false)}
            className="flex-1 min-w-0 text-xs font-semibold"
          />
        ) : (
          <button onClick={() => setOpen(v => !v)}
            className="flex-1 min-w-0 text-left text-xs font-semibold text-wm-text truncate hover:text-wm-text">
            {folder.name}
          </button>
        )}

        <span className="text-2xs text-wm-muted flex-shrink-0 tabular-nums">
          {frames.length} frame{frames.length !== 1 ? 's' : ''}
        </span>

        {/* Add frame to this folder */}
        <button onClick={onAddFrame}
          className="opacity-0 group-hover/folder:opacity-100 flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-wm-muted hover:text-wm-accent hover:bg-wm-surface transition-all"
          title="Add a new frame to this folder">
          <IconPlus size={9} />
        </button>

        {/* Folder ⋯ menu */}
        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
            className="opacity-0 group-hover/folder:opacity-100 w-5 h-5 flex items-center justify-center rounded text-wm-muted hover:text-wm-text hover:bg-wm-surface transition-all"
            title="Folder options"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <circle cx="5" cy="1.5" r="1"/><circle cx="5" cy="5" r="1"/><circle cx="5" cy="8.5" r="1"/>
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-6 z-50 w-36 rounded border border-wm-border bg-wm-surface shadow-lg py-1 text-xs">
              <button onClick={startRename}
                className="w-full text-left px-3 py-1.5 text-wm-text hover:bg-wm-panel transition-colors flex items-center gap-2">
                <IconPencil /> Rename folder
              </button>
              <div className="h-px bg-wm-border mx-2 my-1" />
              <button onClick={() => { onDeleteFolder(); setMenuOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-wm-record hover:bg-wm-panel transition-colors">
                Delete folder
                {frames.length > 0 && <span className="block text-2xs text-wm-muted font-normal mt-0.5">
                  Frames will become ungrouped
                </span>}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Frames grid */}
      {open && (
        <div className="pl-5 pr-1 mt-1.5">
          {frames.length === 0 ? (
            <button onClick={onAddFrame}
              className="w-full rounded-lg border border-dashed border-wm-border text-wm-muted hover:border-wm-accent/50 hover:text-wm-accent transition-colors py-4 text-xs flex flex-col items-center gap-1.5">
              <IconPlus size={12} />
              <span>Add first frame</span>
              <span className="text-2xs opacity-60">e.g. 1080×1920, 1200×628</span>
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {frames.map(p => (
                <FrameCard
                  key={p.id}
                  project={p}
                  folders={allFolders}
                  isActive={p.id === activeProjectId}
                  canDelete={totalProjectCount > 1}
                  onOpen={() => onOpenFrame(p.id)}
                  onRename={name => onRenameFrame(p.id, name)}
                  onDelete={() => onDeleteFrame(p.id)}
                  onMoveToFolder={fid => onMoveFrame(p.id, fid)}
                />
              ))}
              {/* Quick-add tile */}
              <button onClick={onAddFrame}
                className="rounded-lg border border-dashed border-wm-border text-wm-muted hover:border-wm-accent/50 hover:text-wm-accent transition-colors flex flex-col items-center justify-center gap-1 py-3 text-2xs"
                style={{ minHeight: 86 }}>
                <IconPlus size={10} />
                <span>Add frame</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main HomeScreen ──────────────────────────────────────────────────────────

const HomeScreen: React.FC<HomeScreenProps> = ({ onOpen }) => {
  const {
    projects, activeProjectId,
    folders,
    createProject, switchToProject, renameProject, deleteProject,
    createFolder, renameFolder, deleteFolder, moveFrameToFolder,
  } = useAnimationStore(state => ({
    projects: state.projects,
    activeProjectId: state.activeProjectId,
    folders: state.folders,
    createProject: state.createProject,
    switchToProject: state.switchToProject,
    renameProject: state.renameProject,
    deleteProject: state.deleteProject,
    createFolder: state.createFolder,
    renameFolder: state.renameFolder,
    deleteFolder: state.deleteFolder,
    moveFrameToFolder: state.moveFrameToFolder,
  }));

  const [tipDismissed, setTipDismissed] = useState(false);

  // ── Derived lists ──────────────────────────────────────────────────────────
  const ungroupedFrames = projects.filter(p => !p.folderId);
  const framesInFolder = (fid: string) => projects.filter(p => p.folderId === fid);

  // ── Actions ────────────────────────────────────────────────────────────────
  const openFrame = (id: string) => {
    switchToProject(id);
    onOpen();
  };

  const handleNewFolder = () => {
    createFolder('New folder');
    // The folder will appear; user can rename it inline
  };

  const handleAddFrameToFolder = (folderId: string) => {
    createProject('Untitled');
    const newId = useAnimationStore.getState().activeProjectId;
    moveFrameToFolder(newId, folderId);
    openFrame(newId);
  };

  const handleNewUngroupedFrame = () => {
    createProject('Untitled');
    const newId = useAnimationStore.getState().activeProjectId;
    openFrame(newId);
  };

  // ── Empty state ────────────────────────────────────────────────────────────
  const isEmpty = folders.length === 0 && projects.length <= 1 && projects[0]?.layers.length === 0;

  return (
    <div className="flex flex-col h-full bg-wm-bg text-wm-text overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-wm-accent flex-shrink-0">
            <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M6.5 6l5 3-5 3V6z" fill="currentColor"/>
          </svg>
          <div>
            <div className="text-sm font-semibold text-wm-text leading-tight">Wild Motion</div>
            <div className="text-2xs text-wm-muted leading-tight">Animation projects</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button onClick={handleNewFolder}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-wm-border text-wm-muted text-xs hover:text-wm-text hover:border-wm-accent/50 hover:bg-wm-surface transition-colors"
            title="Create a new folder to group frames by campaign or client">
            <IconFolder /> New folder
          </button>
          <button onClick={handleNewUngroupedFrame}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-wm-accent text-white text-xs font-medium hover:bg-wm-accent-hover transition-colors"
            title="Create a new blank frame (you can move it into a folder later)">
            <IconPlus /> New frame
          </button>
        </div>
      </div>

      <div className="h-px bg-wm-border flex-shrink-0" />

      {/* How it works tip — shown until dismissed */}
      {!tipDismissed && (
        <div className="mx-4 mt-3 flex-shrink-0 rounded-lg border border-wm-accent/20 bg-wm-accent/5 px-3 py-2.5 text-2xs text-wm-muted leading-relaxed">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-wm-accent font-medium text-xs">How to organise your work</span>
              <ol className="mt-1 space-y-0.5 list-none">
                <li>1. <strong className="text-wm-text">Create a folder</strong> for each campaign or client (e.g. &quot;McDonald&apos;s SR&quot;)</li>
                <li>2. <strong className="text-wm-text">Add frames</strong> inside — one frame per ad size (e.g. 1080×1920)</li>
                <li>3. <strong className="text-wm-text">Open a frame</strong> to animate it in the timeline</li>
                <li>4. Use <strong className="text-wm-text">⋯</strong> on any frame to rename, move or delete it</li>
              </ol>
            </div>
            <button onClick={() => setTipDismissed(true)}
              className="flex-shrink-0 text-wm-muted hover:text-wm-text transition-colors mt-0.5">
              <IconX size={9} />
            </button>
          </div>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">

        {/* ── Full empty state ─────────────────────────────────────────────── */}
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-8">
            <div className="opacity-30">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <path d="M6 12a3 3 0 013-3h7l3 3h12a3 3 0 013 3v14a3 3 0 01-3 3H9a3 3 0 01-3-3V12z"
                  stroke="currentColor" strokeWidth="1.5" fill="none"/>
                <path d="M20 19v6M17 22h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-wm-text">Start your first project</p>
              <p className="text-2xs text-wm-muted mt-1 leading-relaxed max-w-48">
                Create a folder for your campaign, then add a frame for each ad size you need to animate.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleNewFolder}
                className="flex items-center gap-1.5 px-3 py-2 rounded border border-wm-border text-wm-muted text-xs hover:text-wm-text hover:border-wm-accent/50 hover:bg-wm-surface transition-colors">
                <IconFolder /> Create folder
              </button>
              <button onClick={handleNewUngroupedFrame}
                className="flex items-center gap-1.5 px-3 py-2 rounded bg-wm-accent text-white text-xs font-medium hover:bg-wm-accent-hover transition-colors">
                <IconPlus /> Quick start — new frame
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ── Folders ──────────────────────────────────────────────────── */}
            {folders.map(folder => (
              <FolderSection
                key={folder.id}
                folder={folder}
                frames={framesInFolder(folder.id)}
                allFolders={folders}
                activeProjectId={activeProjectId}
                totalProjectCount={projects.length}
                onOpenFrame={openFrame}
                onRenameFolder={name => renameFolder(folder.id, name)}
                onDeleteFolder={() => deleteFolder(folder.id)}
                onAddFrame={() => handleAddFrameToFolder(folder.id)}
                onRenameFrame={(id, name) => renameProject(id, name)}
                onDeleteFrame={id => deleteProject(id)}
                onMoveFrame={(id, fid) => moveFrameToFolder(id, fid)}
              />
            ))}

            {/* ── Ungrouped frames ─────────────────────────────────────────── */}
            {ungroupedFrames.length > 0 && (
              <div className="mt-1">
                {folders.length > 0 && (
                  <div className="flex items-center gap-2 px-1 py-1 mb-2">
                    <span className="text-xs font-semibold text-wm-muted">Ungrouped frames</span>
                    <span className="text-2xs text-wm-muted opacity-60">— move these into a folder via ⋯</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {ungroupedFrames.map(p => (
                    <FrameCard
                      key={p.id}
                      project={p}
                      folders={folders}
                      isActive={p.id === activeProjectId}
                      canDelete={projects.length > 1}
                      onOpen={() => openFrame(p.id)}
                      onRename={name => renameProject(p.id, name)}
                      onDelete={() => deleteProject(p.id)}
                      onMoveToFolder={fid => moveFrameToFolder(p.id, fid)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── No folders yet hint ───────────────────────────────────────── */}
            {folders.length === 0 && ungroupedFrames.length > 0 && (
              <button onClick={handleNewFolder}
                className="mt-3 w-full rounded-lg border border-dashed border-wm-border text-wm-muted hover:border-wm-accent/50 hover:text-wm-accent transition-colors py-3 text-2xs flex items-center justify-center gap-2">
                <IconFolder />
                <span>Create a folder to organise these frames</span>
              </button>
            )}
          </>
        )}
      </div>

      {/* Status bar */}
      <div className="flex-shrink-0 border-t border-wm-border px-4 py-2 flex items-center justify-between">
        <span className="text-2xs text-wm-muted">
          {folders.length > 0 ? `${folders.length} folder${folders.length !== 1 ? 's' : ''} · ` : ''}
          {projects.length} frame{projects.length !== 1 ? 's' : ''}
        </span>
        <span className="text-2xs text-wm-muted opacity-50">Use ⋯ on any frame to rename or move</span>
      </div>
    </div>
  );
};

export default HomeScreen;
