import { NextResponse } from 'next/server';
import { CreateUserUseCase } from '@/core/application/use-cases/CreateUserUseCase';
import { TursoUserRepository } from '@/infrastructure/persistence/turso-user.repository';

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
