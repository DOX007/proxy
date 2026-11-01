import worker from '../worker.js';

export function onRequest({ request, env }) {
  return worker.fetch(request, env);
}
