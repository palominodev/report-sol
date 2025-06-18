import ListaInformes from '../../components/ListaInformes';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="container mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <div className="flex gap-4">
              <Link 
                href={'/dashboard/publicadores'}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Lista de grupos
              </Link>
              <Link 
                href={'/usuario/nuevo'}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Crear Publicador
              </Link>
            </div>
          </div>
        </div>
        <div className="lg:col-span-2">
          <ListaInformes />
        </div>
      </div>
    </div>
  );
}