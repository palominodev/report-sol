'use client'
import { useState } from 'react';

interface MenuAccionesProps {
  idUsuario: number;
  onEliminar: (id: number) => void;
  onMoverGrupo: (id: number) => void;
  onActualizar: (id: number) => void;
}

export default function MenuAcciones({ idUsuario, onEliminar, onMoverGrupo, onActualizar }: MenuAccionesProps) {
  const [menuAbierto, setMenuAbierto] = useState(false);

  const handleAccion = (accion: () => void) => {
    accion();
    setMenuAbierto(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setMenuAbierto(!menuAbierto)}
        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md"
      >
        Acciones
      </button>
      {menuAbierto && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
          <div className="py-1">
            <button
              onClick={() => handleAccion(() => onEliminar(idUsuario))}
              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
            >
              Eliminar
            </button>
            <button
              onClick={() => handleAccion(() => onMoverGrupo(idUsuario))}
              className="block w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-gray-100"
            >
              Mover a otro grupo
            </button>
            <button
              onClick={() => handleAccion(() => onActualizar(idUsuario))}
              className="block w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-gray-100"
            >
              Actualizar
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 