'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface PublicadorOption {
  id_usuario: number;
  nombre: string;
  apellido: string;
  id_grupo: number;
}

export default function BuscadorPublicadores({
  publicadores,
}: {
  publicadores: PublicadorOption[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const listId = 'buscador-publicadores-listbox';

  const normalized = query.trim().toLowerCase();
  const matches = normalized
    ? publicadores.filter((publicador) => {
        const nombreCompleto = `${publicador.nombre} ${publicador.apellido}`.toLowerCase();
        const nombreInvertido = `${publicador.apellido} ${publicador.nombre}`.toLowerCase();
        return nombreCompleto.includes(normalized) || nombreInvertido.includes(normalized);
      })
    : publicadores;

  const close = () => {
    setOpen(false);
    setActiveIndex(-1);
  };

  const navigate = (publicador: PublicadorOption) => {
    close();
    router.push(`grupo/${publicador.id_grupo}?informe=${publicador.id_usuario}`);
  };

  const handleSearch = () => {
    if (normalized && matches.length > 0) {
      navigate(matches[0]);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!open) {
          setOpen(true);
          setActiveIndex(0);
        } else {
          setActiveIndex((i) => Math.min(i + 1, matches.length - 1));
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        event.preventDefault();
        if (open && activeIndex >= 0 && matches[activeIndex]) {
          navigate(matches[activeIndex]);
        } else if (normalized) {
          handleSearch();
        } else {
          setOpen(true);
        }
        break;
      case 'Escape':
        close();
        break;
    }
  };

  const activeDescendant =
    open && activeIndex >= 0 && matches[activeIndex]
      ? `buscador-publicadores-option-${matches[activeIndex].id_usuario}`
      : undefined;

  return (
    <div
      className="relative z-10"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          close();
        }
      }}
    >
      <div className="flex items-stretch gap-2">
        <div className="relative">
          <input
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={activeDescendant}
            aria-autocomplete="list"
            aria-label="Buscar publicador"
            placeholder="Elija o escriba un publicador"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
              setActiveIndex(-1);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            className="h-10 w-56 border border-line-on-light bg-surface-light px-3 pr-9 text-sm text-ink-on-light placeholder:text-ink-muted-on-light focus:outline-none focus:ring-2 focus:ring-brand-light sm:w-64"
          />
          <button
            type="button"
            aria-label={open ? 'Cerrar lista de publicadores' : 'Abrir lista de publicadores'}
            onClick={() => setOpen((value) => !value)}
            className="absolute inset-y-0 right-0 flex w-8 items-center justify-center text-ink-muted-on-light hover:text-ink-on-light"
          >
            <svg
              aria-hidden="true"
              className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        <button
          type="button"
          onClick={handleSearch}
          className="h-10 bg-brand px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-brand-light"
        >
          Buscar
        </button>
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Publicadores"
          onMouseDown={(event) => event.preventDefault()}
          className="absolute left-0 top-full z-10 mt-1 max-h-60 w-56 overflow-auto border border-line-on-light bg-surface-light sm:w-64"
        >
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-sm text-ink-muted-on-light">Sin resultados</li>
          ) : (
            matches.map((publicador, index) => (
              <li
                key={publicador.id_usuario}
                id={`buscador-publicadores-option-${publicador.id_usuario}`}
                role="option"
                aria-selected={index === activeIndex}
              >
                <button
                  type="button"
                  onClick={() => navigate(publicador)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`block w-full px-3 py-2 text-left text-sm text-ink-on-light ${
                    index === activeIndex ? 'bg-brand-tint' : ''
                  }`}
                >
                  {publicador.nombre} {publicador.apellido}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
