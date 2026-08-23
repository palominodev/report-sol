import { describe, it, expect, vi } from 'vitest';
import { CreateUserUseCase } from '../use-cases/CreateUserUseCase';
import { UpdateUserUseCase } from '../use-cases/UpdateUserUseCase';
import { IUserRepository } from '@/core/domain/repositories/IUserRepository';
import { ValidationError } from '@/core/domain/errors/ValidationError';

describe('User Role Exclusivity and Validation', () => {
  const mockRepo: IUserRepository = {
    create: vi.fn().mockResolvedValue({ id_usuario: 1 }),
    findById: vi.fn().mockResolvedValue(null),
    findByIdWithDetails: vi.fn().mockResolvedValue(null),
    findAllWithDetails: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    assignToGroup: vi.fn().mockResolvedValue(undefined),
    findAllAssignable: vi.fn().mockResolvedValue([]),
  };

  describe('CreateUserUseCase', () => {
    const createUser = new CreateUserUseCase(mockRepo);

    it('should assign publicador as default preaching role when no preaching role is provided', async () => {
      await createUser.execute({
        nombre: 'Juan',
        apellido: 'Perez',
        id_grupo: 1,
        roles: ['anciano'],
        rol_en_grupo: 'encargado',
      });

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: ['publicador', 'anciano'],
        })
      );
    });

    it('should assign publicador when roles array is empty', async () => {
      await createUser.execute({
        nombre: 'Maria',
        apellido: 'Gomez',
        id_grupo: 1,
        roles: [],
        rol_en_grupo: 'miembro',
      });

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: ['publicador'],
        })
      );
    });

    it('should accept a single valid preaching role', async () => {
      await createUser.execute({
        nombre: 'Carlos',
        apellido: 'Lopez',
        id_grupo: 2,
        roles: ['regular', 'siervo'],
        rol_en_grupo: 'auxiliar',
      });

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          roles: ['regular', 'siervo'],
        })
      );
    });

    it('should throw ValidationError when multiple preaching roles are provided', async () => {
      await expect(
        createUser.execute({
          nombre: 'Augusto',
          apellido: 'Correa',
          id_grupo: 1,
          roles: ['publicador', 'regular'],
          rol_en_grupo: 'miembro',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when both anciano and siervo are provided', async () => {
      await expect(
        createUser.execute({
          nombre: 'Pedro',
          apellido: 'Suarez',
          id_grupo: 1,
          roles: ['publicador', 'anciano', 'siervo'],
          rol_en_grupo: 'encargado',
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('UpdateUserUseCase', () => {
    const updateUser = new UpdateUserUseCase(mockRepo);

    it('should successfully update with valid single preaching role', async () => {
      await updateUser.execute(1, {
        nombre: 'Carlos',
        apellido: 'Lopez',
        id_grupo: 2,
        roles: ['auxiliar', 'siervo'],
        rol_en_grupo: 'auxiliar',
      });

      expect(mockRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          roles: ['auxiliar', 'siervo'],
        })
      );
    });

    it('should reject update with multiple preaching roles', async () => {
      await expect(
        updateUser.execute(1, {
          nombre: 'Carlos',
          apellido: 'Lopez',
          id_grupo: 2,
          roles: ['auxiliar', 'regular'],
          rol_en_grupo: 'auxiliar',
        })
      ).rejects.toThrow(ValidationError);
    });
  });
});
