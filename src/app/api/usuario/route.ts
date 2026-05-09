import { NextResponse } from 'next/server';
import { CreateUserUseCase } from '@/core/application/use-cases/CreateUserUseCase';
import { GetUsersUseCase } from '@/core/application/use-cases/GetUsersUseCase';
import { TursoUserRepository } from '@/infrastructure/persistence/turso-user.repository';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const grupoId = searchParams.get('grupoId');
    const userRepository = new TursoUserRepository();
    const getUsersUseCase = new GetUsersUseCase(userRepository);
    const users = await getUsersUseCase.executeWithDetails(grupoId ? Number(grupoId) : undefined);
    return NextResponse.json(users);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const userRepository = new TursoUserRepository();
    const createUserUseCase = new CreateUserUseCase(userRepository);

    await createUserUseCase.execute(data);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
