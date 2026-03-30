import { IInformeRepository } from '@/core/domain/repositories/IInformeRepository';

export class DeleteInformeUseCase {
  constructor(private informeRepository: IInformeRepository) {}

  async execute(id: number): Promise<void> {
    await this.informeRepository.delete(id);
  }
}
