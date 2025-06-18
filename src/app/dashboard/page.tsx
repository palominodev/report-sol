import ListaInformes from '../../components/ListaInformes';

export default function DashboardPage() {
  return (
    <div className="container mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-2">
          <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        </div>
        <div className="lg:col-span-2">
          <ListaInformes />
        </div>
      </div>
    </div>
  );
}