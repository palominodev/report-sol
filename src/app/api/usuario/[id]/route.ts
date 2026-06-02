import { NextResponse } from 'next/server';
import { UpdateUserUseCase } from '@/core/application/use-cases/UpdateUserUseCase';
import { DeleteUserUseCase } from '@/core/application/use-cases/DeleteUserUseCase';
import { getUserRepository } from '@/infrastructure/config/di';
import { ValidationError } from '@/core/domain/errors/ValidationError';

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
    const userRepository = getUserRepository();
    const updateUserUseCase = new UpdateUserUseCase(userRepository);

    await updateUserUseCase.execute(Number(id), data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error interno del servidor al actualizar usuario' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const userRepository = getUserRepository();
    const deleteUserUseCase = new DeleteUserUseCase(userRepository);

    await deleteUserUseCase.execute(Number(id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error interno del servidor al eliminar usuario' }, { status: 500 });
  }
}
