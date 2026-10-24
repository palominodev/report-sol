import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getValidateSessionUseCase } from '@/infrastructure/config/di';
import { readSessionToken } from './session-cookie';
import { createWithAuth } from './with-auth';
import { createRequireAccount } from './require-account';

const validate = (token: string | undefined) => getValidateSessionUseCase().execute(token);

/** Wrap every API route handler: `export const GET = withAuth(async (request, context, account) => ...)`. */
export const withAuth = createWithAuth(validate);

/** Call at the top of every server page: `await requireAccount()`. */
export const requireAccount = createRequireAccount({
  readToken: async () => readSessionToken((await headers()).get('cookie')),
  validate,
  redirect,
});
