import { useEffect, useMemo, useRef, useState } from 'react';
import { Command, FileText, Search, X } from 'lucide-react';
import { formatShortcut } from '../editor/shortcuts';
import { CommandDefinition } from '../types';
import './CommandOverlay.css';

type OverlayMode = 'palette' | 'shortcuts';
type PaletteScope = 'all' | 'files';

interface CommandOverlayProps {
  isOpen: boolean;
  mode: OverlayMode;
  scope: PaletteScope;
  commands: CommandDefinition[];
  files: string[];
  activeFile: string;
  isMac: boolean;
  onClose: () => void;
  onSelectFile: (file: string) => void;
}

interface PaletteItem {
  id: string;
  label: string;
  meta?: string;
  keywords: string[];
  icon: 'command' | 'file';
  disabled?: boolean;
  action: () => void;
}

export function CommandOverlay({
  isOpen,
  mode,
  scope,
  commands,
  files,
  activeFile,
  isMac,
  onClose,
  onSelectFile,
}: CommandOverlayProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setQuery('');
    setSelectedIndex(0);
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [isOpen, mode, scope]);

  const paletteItems = useMemo<PaletteItem[]>(() => {
    const commandItems = scope === 'files'
      ? []
      : commands.map((command) => ({
          id: command.id,
          label: command.label,
          meta: command.shortcut ? formatShortcut(command.shortcut, isMac) : command.stateLabel,
          keywords: [command.group, command.description ?? '', command.stateLabel ?? '', ...(command.keywords ?? [])],
          icon: 'command' as const,
          disabled: command.disabled,
          action: () => {
            command.action();
            onClose();
          },
        }));

    const fileItems = files.map((file) => ({
      id: `file:${file}`,
      label: file,
      meta: file === activeFile ? 'Open' : 'File',
      keywords: [file, 'file', 'open', 'switch'],
      icon: 'file' as const,
      action: () => {
        onSelectFile(file);
        onClose();
      },
    }));

    return [...commandItems, ...fileItems];
  }, [activeFile, commands, files, isMac, onClose, onSelectFile, scope]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const items = normalizedQuery
      ? paletteItems.filter((item) => {
          const haystack = [item.label, item.meta ?? '', ...item.keywords].join(' ').toLowerCase();
          return haystack.includes(normalizedQuery);
        })
      : paletteItems;

    return items.slice(0, 40);
  }, [paletteItems, query]);

  useEffect(() => {
    setSelectedIndex((current) => {
      if (filteredItems.length === 0) {
        return 0;
      }

      return Math.min(current, filteredItems.length - 1);
    });
  }, [filteredItems]);

  if (!isOpen) {
    return null;
  }

  const executeSelected = () => {
    const selectedItem = filteredItems[selectedIndex];
    if (!selectedItem || selectedItem.disabled) {
      return;
    }

    selectedItem.action();
  };

  const groupedShortcuts = commands
    .filter((command) => command.shortcut)
    .reduce<Record<string, CommandDefinition[]>>((groups, command) => {
      groups[command.group] = groups[command.group] ?? [];
      groups[command.group].push(command);
      return groups;
    }, {});

  return (
    <div className="command-overlay-backdrop" onClick={onClose} role="presentation">
      <div
        className={`command-overlay-panel ${mode === 'shortcuts' ? 'shortcuts-mode' : ''}`}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            onClose();
            return;
          }

          if (mode !== 'palette') {
            return;
          }

          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setSelectedIndex((current) => Math.min(current + 1, Math.max(filteredItems.length - 1, 0)));
            return;
          }

          if (event.key === 'ArrowUp') {
            event.preventDefault();
            setSelectedIndex((current) => Math.max(current - 1, 0));
            return;
          }

          if (event.key === 'Enter') {
            event.preventDefault();
            executeSelected();
          }
        }}
      >
        {mode === 'palette' ? (
          <>
            <div className="command-overlay-header">
              <div className="command-overlay-title-group">
                <span className="command-overlay-icon"><Search size={16} /></span>
                <div>
                  <div className="command-overlay-title">{scope === 'files' ? 'Quick File Switch' : 'Command Palette'}</div>
                  <div className="command-overlay-subtitle">
                    {scope === 'files' ? 'Search project files' : 'Search commands and files'}
                  </div>
                </div>
              </div>
              <button className="command-overlay-close" onClick={onClose} aria-label="Close command overlay">
                <X size={16} />
              </button>
            </div>

            <div className="command-overlay-search-row">
              <Search size={15} className="command-overlay-search-icon" />
              <input
                ref={inputRef}
                className="command-overlay-input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={scope === 'files' ? 'Type a file name or path' : 'Type a command or file name'}
              />
            </div>

            <div className="command-overlay-results" role="listbox" aria-label="Command results">
              {filteredItems.length === 0 ? (
                <div className="command-overlay-empty">No results for "{query}".</div>
              ) : (
                filteredItems.map((item, index) => (
                  <button
                    key={item.id}
                    className={`command-overlay-item ${index === selectedIndex ? 'selected' : ''}`}
                    onMouseEnter={() => setSelectedIndex(index)}
                    onClick={item.action}
                    disabled={item.disabled}
                  >
                    <span className="command-overlay-item-icon">
                      {item.icon === 'file' ? <FileText size={15} /> : <Command size={15} />}
                    </span>
                    <span className="command-overlay-item-main">
                      <span className="command-overlay-item-label">{item.label}</span>
                      {item.meta && <span className="command-overlay-item-meta">{item.meta}</span>}
                    </span>
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          <>
            <div className="command-overlay-header">
              <div className="command-overlay-title-group">
                <span className="command-overlay-icon"><Command size={16} /></span>
                <div>
                  <div className="command-overlay-title">Keyboard Shortcuts</div>
                  <div className="command-overlay-subtitle">Productive actions, grouped by workflow</div>
                </div>
              </div>
              <button className="command-overlay-close" onClick={onClose} aria-label="Close shortcuts help">
                <X size={16} />
              </button>
            </div>

            <div className="shortcut-groups">
              {Object.entries(groupedShortcuts).map(([group, groupCommands]) => (
                <section key={group} className="shortcut-group">
                  <h3 className="shortcut-group-title">{group}</h3>
                  <div className="shortcut-group-list">
                    {groupCommands.map((command) => (
                      <div key={command.id} className="shortcut-row">
                        <div className="shortcut-row-main">
                          <span className="shortcut-row-label">{command.label}</span>
                          {command.description && (
                            <span className="shortcut-row-description">{command.description}</span>
                          )}
                        </div>
                        <kbd className="shortcut-row-key">
                          {command.shortcut ? formatShortcut(command.shortcut, isMac) : ''}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
