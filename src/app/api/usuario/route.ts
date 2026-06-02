import { NextResponse } from 'next/server';
import { CreateUserUseCase } from '@/core/application/use-cases/CreateUserUseCase';
import { GetUsersUseCase } from '@/core/application/use-cases/GetUsersUseCase';
import { getUserRepository } from '@/infrastructure/config/di';
import { ValidationError } from '@/core/domain/errors/ValidationError';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const grupoId = searchParams.get('grupoId');
    const userRepository = getUserRepository();
    const getUsersUseCase = new GetUsersUseCase(userRepository);
    const users = await getUsersUseCase.executeWithDetails(grupoId ? Number(grupoId) : undefined);
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error interno del servidor al obtener usuarios' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const userRepository = getUserRepository();
    const createUserUseCase = new CreateUserUseCase(userRepository);

    await createUserUseCase.execute(data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error interno del servidor al crear usuario' }, { status: 500 });
  }
}
