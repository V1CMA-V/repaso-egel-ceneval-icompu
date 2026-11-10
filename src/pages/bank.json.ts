import type { APIRoute } from 'astro';
import { getBank } from '@/lib/content';

/** Banco completo de preguntas para la práctica mixta y los simulacros (se genera en el build). */
export const GET: APIRoute = async () =>
  new Response(JSON.stringify(await getBank()), { headers: { 'Content-Type': 'application/json' } });
