import { copyFile, mkdir } from 'node:fs/promises';

// Les hébergeurs statiques servent /join/index.html pour l'URL publique
// /join/. Le nom de route reste ainsi compris par Expo Router côté client.
await mkdir(new URL('../dist/join/', import.meta.url), { recursive: true });
await copyFile(
  new URL('../dist/join.html', import.meta.url),
  new URL('../dist/join/index.html', import.meta.url),
);
