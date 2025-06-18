'use client';

import { useState } from 'react';

interface FormularioInformeProps {
  id_usuario: number;
  nombre: string;
  apellido: string;
  roles: string[];
  onClose: () => void;
  onSubmit: (data: InformeData) => Promise<void>;
}

interface InformeData {
  horas: number;
  cursos: number;
  año: number;
  mes: string;
  participacion: boolean;
}

const meses = [
  'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
  'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'
];

export default function FormularioInforme({ id_usuario, nombre, apellido, roles, onClose, onSubmit }: FormularioInformeProps) {
  const [formData, setFormData] = useState<InformeData>({
    horas: 0,
    cursos: 0,
    año: new Date().getFullYear(),
    mes: meses[new Date().getMonth()],
    participacion: true
  });

  const esPublicador = roles.includes('publicador');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Registrar Informe</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        <p className="text-gray-600 mb-4">
          Informe para: {nombre} {apellido}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!esPublicador && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Horas
              </label>
              <input
                type="number"
                min="0"
                defaultValue={formData.horas || 0}
                onChange={(e) => setFormData({ ...formData, horas: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cursos
            </label>
            <input
              type="number"
              min="0"
              defaultValue={formData.cursos || 0}
              onChange={(e) => setFormData({ ...formData, cursos: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Año
            </label>
            <input
              disabled
              type="number"
              min="2000"
              max="2100"
              defaultValue={formData.año || 0}
              onChange={(e) => setFormData({ ...formData, año: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mes
            </label>
            <select
              defaultValue={formData.mes}
              onChange={(e) => setFormData({ ...formData, mes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {meses.map((mes) => (
                <option key={mes} value={mes}>
                  {mes}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="participacion"
              defaultChecked={formData.participacion}
              onChange={(e) => setFormData({ ...formData, participacion: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="participacion" className="ml-2 block text-sm text-gray-700">
              Participación
            </label>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 