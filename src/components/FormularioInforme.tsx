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
  trabajo_como_auxiliar: boolean;
  notas: string | null;
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
    mes: meses[new Date().getMonth() - 1],
    participacion: true,
    trabajo_como_auxiliar: false,
    notas: null
  });

  const esPublicador = roles.includes('publicador');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#4A90E2] to-[#2E5BBA] rounded-t-xl p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#4A90E2] bg-opacity-20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'SF Pro Display, Roboto, Arial, sans-serif' }}>
                  Registrar Informe
                </h2>
                <p className="text-blue-100 text-sm" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
                  {nombre} {apellido}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-[#F44336] bg-opacity-20 rounded-lg flex items-center justify-center text-white hover:bg-opacity-30 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* User Info Card */}
          <div className="bg-[#F5F5F5] rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#4A90E2] to-[#2E5BBA] rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {nombre.charAt(0)}{apellido.charAt(0)}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-[#333333]" style={{ fontFamily: 'SF Pro Display, Roboto, Arial, sans-serif' }}>
                  {nombre} {apellido}
                </h3>
                <p className="text-sm text-[#666666]" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
                  ID: {id_usuario}
                </p>
                {roles.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {roles.map((rol, index) => (
                      <span key={index} className="px-2 py-1 bg-[#E8F4FD] text-[#4A90E2] rounded-full text-xs font-medium">
                        {rol}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {(!esPublicador || formData.trabajo_como_auxiliar) && (
              <div>
                <label className="block text-sm font-semibold text-[#333333] mb-2" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
                  Horas
                </label>
                <input
                  type="number"
                  min="0"
                  defaultValue={formData.horas || 0}
                  onChange={(e) => setFormData({ ...formData, horas: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent transition-all"
                  placeholder="Ingresa las horas"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-[#333333] mb-2" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
                Cursos
              </label>
              <input
                type="number"
                min="0"
                defaultValue={formData.cursos || 0}
                onChange={(e) => setFormData({ ...formData, cursos: parseInt(e.target.value) })}
                className="w-full px-4 py-3 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent transition-all"
                placeholder="Ingresa el número de cursos"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#333333] mb-2" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
                Notas
              </label>
              <textarea
                defaultValue={formData.notas || ''}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                className="w-full px-4 py-3 border border-[#E0E0E0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A90E2] focus:border-transparent transition-all"
                placeholder="Ingresa las notas"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#333333] mb-2" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
                  Año
                </label>
                <input
                  disabled
                  type="number"
                  min="2000"
                  max="2100"
                  defaultValue={formData.año || 0}
                  onChange={(e) => setFormData({ ...formData, año: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 border border-[#E0E0E0] rounded-lg bg-[#F5F5F5] text-[#666666] cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#333333] mb-2" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
                  Mes
                </label>
                <select
                  disabled
                  defaultValue={formData.mes}
                  onChange={(e) => setFormData({ ...formData, mes: e.target.value })}
                  className="w-full px-4 py-3 border border-[#E0E0E0] rounded-lg bg-[#F5F5F5] text-[#666666] cursor-not-allowed"
                >
                  {meses.map((mes) => (
                    <option key={mes} value={mes}>
                      {mes}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-[#E8F4FD] rounded-lg p-4">
              <label htmlFor="participacion" className="flex items-start cursor-pointer">
                <input
                  type="checkbox"
                  id="participacion"
                  defaultChecked={formData.participacion}
                  onChange={(e) => setFormData({ ...formData, participacion: e.target.checked })}
                  className="h-5 w-5 border-[#E0E0E0] rounded transition-colors mt-0.5 mr-3 checked:bg-[#4A90E2] checked:border-[#4A90E2] focus:ring-[#4A90E2] focus:ring-2"
                />
                <div>
                  <span className="block text-sm font-medium text-[#333333]" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
                    Participación en el mes
                  </span>
                  <p className="text-xs text-[#666666] mt-1" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
                    Marca esta casilla si el miembro participó durante el mes seleccionado
                  </p>
                </div>
              </label>
            </div>

            {/* Nuevo checkbox para trabajo como auxiliar - solo para publicadores */}
            {esPublicador && (
              <div className="bg-[#E8F5E8] rounded-lg p-4">
                <label htmlFor="trabajo_como_auxiliar" className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    id="trabajo_como_auxiliar"
                    defaultChecked={formData.trabajo_como_auxiliar}
                    onChange={(e) => setFormData({ ...formData, trabajo_como_auxiliar: e.target.checked })}
                    className="h-5 w-5 border-[#E0E0E0] rounded transition-colors mt-0.5 mr-3 checked:bg-[#4CAF50] checked:border-[#4CAF50] focus:ring-[#4CAF50] focus:ring-2"
                  />
                  <div>
                    <span className="block text-sm font-medium text-[#333333]" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
                      Trabajó como Precursor Auxiliar
                    </span>
                    <p className="text-xs text-[#666666] mt-1" style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}>
                      Marca esta casilla si el publicador trabajó como precursor auxiliar durante el mes seleccionado
                    </p>
                  </div>
                </label>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-[#E0E0E0]">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-sm font-semibold text-[#4A90E2] bg-white border border-[#4A90E2] rounded-lg hover:bg-[#E8F4FD] transition-all"
                style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-[#4A90E2] to-[#2E5BBA] rounded-lg hover:from-[#2E5BBA] hover:to-[#4A90E2] transition-all shadow-sm"
                style={{ fontFamily: 'SF Pro Text, Roboto, Arial, sans-serif' }}
              >
                Guardar Informe
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 