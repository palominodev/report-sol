'use client'
import { useState, useRef, useEffect } from 'react';

interface MenuAccionesProps {
  idUsuario: number;
  onEliminar: (id: number) => void;
  onMoverGrupo: (id: number) => void;
  onActualizar: (id: number) => void;
}

export default function MenuAcciones({ idUsuario, onEliminar, onMoverGrupo, onActualizar }: MenuAccionesProps) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuAbierto(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAccion = (accion: () => void) => {
    accion();
    setMenuAbierto(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuAbierto(!menuAbierto)}
        className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all"
        style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
        Acciones
        <svg className={`w-4 h-4 ml-2 transition-transform ${menuAbierto ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {menuAbierto && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
          <div className="py-2">
            {/* Header */}
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'SF Pro Display, Roboto, Arial, sans-serif' }}>
                Acciones Disponibles
              </h3>
            </div>
            
            {/* Action Buttons */}
            <div className="py-1">
              <button
                onClick={() => handleAccion(() => onActualizar(idUsuario))}
                className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}
              >
                <svg className="w-4 h-4 mr-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <div className="text-left">
                  <div className="font-medium">Editar Publicador</div>
                  <div className="text-xs text-gray-500">Modificar información</div>
                </div>
              </button>
              
              <button
                onClick={() => handleAccion(() => onMoverGrupo(idUsuario))}
                className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors"
                style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}
              >
                <svg className="w-4 h-4 mr-3 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <div className="text-left">
                  <div className="font-medium">Mover a Otro Grupo</div>
                  <div className="text-xs text-gray-500">Cambiar asignación</div>
                </div>
              </button>
              
              <div className="border-t border-gray-100 my-1"></div>
              
              <button
                onClick={() => handleAccion(() => onEliminar(idUsuario))}
                className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors"
                style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}
              >
                <svg className="w-4 h-4 mr-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <div className="text-left">
                  <div className="font-medium">Eliminar Publicador</div>
                  <div className="text-xs text-gray-500">Eliminar permanentemente</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 