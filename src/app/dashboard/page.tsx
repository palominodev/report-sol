'use client'
import { useState } from 'react';
import Link from 'next/link';

export default function Dashboard() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Menú lateral */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out md:relative md:translate-x-0`}>
        <div className="p-4">
          <h2 className="text-xl font-semibold">Dashboard</h2>
          <nav className="mt-4">
            <Link href="/dashboard/publicadores" className="block py-2 text-gray-600 hover:text-blue-600">
              Publicadores
            </Link>
            {/* Agrega más enlaces aquí */}
          </nav>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 p-4">
        <button
          className="md:hidden p-2 bg-blue-600 text-white rounded"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? 'Cerrar' : 'Menú'}
        </button>
        <h1 className="text-2xl font-bold mt-4">Bienvenido al Dashboard</h1>
        <p className="mt-2">Selecciona una opción del menú lateral.</p>
      </main>
    </div>
  );
}