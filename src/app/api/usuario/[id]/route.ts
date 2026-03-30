import { NextResponse } from 'next/server';
import { UpdateUserUseCase } from '@/core/application/use-cases/UpdateUserUseCase';
import { DeleteUserUseCase } from '@/core/application/use-cases/DeleteUserUseCase';
import { TursoUserRepository } from '@/infrastructure/persistence/turso-user.repository';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function PUT(
  request: Request,
  { params }: RouteParams
) {
  try {
    const data = await request.json();
    const { id } = await params;
    const userRepository = new TursoUserRepository();
    const updateUserUseCase = new UpdateUserUseCase(userRepository);

    await updateUserUseCase.execute(Number(id), data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const userRepository = new TursoUserRepository();
    const deleteUserUseCase = new DeleteUserUseCase(userRepository);

    await deleteUserUseCase.execute(Number(id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
