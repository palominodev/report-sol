'use client';

import { useEffect, useRef, useState } from 'react';
import { nextActiveIndex, type NavigationKey } from './listbox-navigation';

export interface PickerUser {
  id_usuario: number;
  nombre: string;
  apellido: string;
  /** e.g. "Hace 3 meses y 12 días que no participa" */
  participationLabel?: string;
}

const NAVIGATION_KEYS: readonly string[] = ['ArrowDown', 'ArrowUp', 'Home', 'End'];

function fullName(user: PickerUser) {
  return `${user.nombre} ${user.apellido}`;
}

interface ParticipantOptionsProps {
  listId: string;
  users: PickerUser[];
  selectedId: string;
  /** Person already assigned to this slot, flagged inside the list. */
  currentId: number | null;
  activeIndex: number;
  onSelect: (id: string) => void;
  onActivate: (index: number) => void;
}

export function ParticipantOptions({ listId, users, selectedId, currentId, activeIndex, onSelect, onActivate }: ParticipantOptionsProps) {
  if (users.length === 0) {
    return <p className="px-3 py-3 text-sm text-ink-muted">No hay hermanos disponibles</p>;
  }

  return (
    <ul id={listId} role="listbox" aria-label="Hermanos disponibles" className="m-0 list-none p-0">
      {users.map((user, index) => {
        const selected = String(user.id_usuario) === selectedId;
        const active = index === activeIndex;
        return (
          <li
            key={user.id_usuario}
            id={`${listId}-option-${index}`}
            role="option"
            aria-selected={selected}
            data-active={active ? 'true' : undefined}
            onClick={() => onSelect(String(user.id_usuario))}
            onMouseMove={() => {
              if (!active) onActivate(index);
            }}
            className={`flex min-h-11 cursor-pointer items-center gap-3 border-b border-line px-3 py-2 last:border-b-0 ${
              selected ? 'bg-brand-highlight' : active ? 'bg-nav' : 'bg-surface'
            }`}
          >
            <span className="w-6 shrink-0 text-center text-xs font-bold tabular-nums text-ink-muted">{index + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink">{fullName(user)}</span>
              {user.participationLabel && (
                <span className="block text-xs text-ink-muted">{user.participationLabel}</span>
              )}
            </span>
            {user.id_usuario === currentId && (
              <span className="shrink-0 border border-line px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-brand-light">
                Asignado
              </span>
            )}
            {selected && (
              <svg aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m5 12 5 5 9-10" />
              </svg>
            )}
          </li>
        );
      })}
    </ul>
  );
}

interface ParticipantPickerProps {
  id: string;
  users: PickerUser[];
  value: string;
  currentId: number | null;
  disabled: boolean;
  describedBy?: string;
  onChange: (id: string) => void;
}

/**
 * Listbox-pattern replacement for a native <select>: every option can render
 * name + wait time + position, which <option> elements cannot do.
 * Keyboard handling lives on the trigger (focus never leaves it) and the
 * highlighted option is announced through aria-activedescendant.
 */
export default function ParticipantPicker({ id, users, value, currentId, disabled, describedBy, onChange }: ParticipantPickerProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listId = `${id}-list`;
  const selectedIndex = users.findIndex((u) => String(u.id_usuario) === value);
  const selectedUser = selectedIndex >= 0 ? users[selectedIndex] : null;

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    document.getElementById(`${listId}-option-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex, listId]);

  function openList(from: 'first' | 'last' = 'first') {
    setOpen(true);
    setActiveIndex(
      selectedIndex >= 0 ? selectedIndex : nextActiveIndex(from === 'last' ? 'ArrowUp' : 'ArrowDown', -1, users.length),
    );
  }

  function closeList() {
    setOpen(false);
    setActiveIndex(-1);
  }

  function choose(userId: string) {
    onChange(userId);
    closeList();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    const { key } = event;
    if (!open) {
      if (key === 'ArrowDown' || key === 'Enter' || key === ' ') {
        event.preventDefault();
        openList('first');
      } else if (key === 'ArrowUp') {
        event.preventDefault();
        openList('last');
      }
      return;
    }
    if (NAVIGATION_KEYS.includes(key)) {
      event.preventDefault();
      setActiveIndex((current) => nextActiveIndex(key as NavigationKey, current, users.length));
    } else if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      if (users[activeIndex]) choose(String(users[activeIndex].id_usuario));
    } else if (key === 'Escape') {
      event.preventDefault();
      closeList();
    } else if (key === 'Tab') {
      closeList();
    }
  }

  return (
    <div
      ref={wrapperRef}
      className="relative min-w-0 flex-1"
      onBlur={(event) => {
        if (!wrapperRef.current?.contains(event.relatedTarget as Node | null)) closeList();
      }}
    >
      <button
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        onKeyDown={handleKeyDown}
        onClick={(event) => {
          // detail 0 = keyboard-generated click, already handled in onKeyDown.
          if (event.detail === 0) return;
          if (open) closeList();
          else openList();
        }}
        className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 border border-line bg-surface px-3 py-1.5 text-left transition-colors hover:bg-nav focus:outline-none focus-visible:border-brand-light focus-visible:ring-2 focus-visible:ring-brand-light/40 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="min-w-0">
          {selectedUser ? (
            <>
              <span className="block truncate text-sm font-semibold text-ink">{fullName(selectedUser)}</span>
              {selectedUser.participationLabel && (
                <span className="block truncate text-xs text-ink-muted">{selectedUser.participationLabel}</span>
              )}
            </>
          ) : (
            <span className="block text-sm text-ink-muted">Seleccionar</span>
          )}
        </span>
        <svg
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-icon transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div
          // Keeps focus on the trigger while using the list scrollbar or clicking an option.
          onMouseDown={(event) => event.preventDefault()}
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto border border-line bg-surface"
        >
          <p className="sticky top-0 border-b border-line bg-surface px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            Orden sugerido: quien hace más que no participa primero
          </p>
          <ParticipantOptions
            listId={listId}
            users={users}
            selectedId={value}
            currentId={currentId}
            activeIndex={activeIndex}
            onSelect={choose}
            onActivate={setActiveIndex}
          />
        </div>
      )}
    </div>
  );
}
