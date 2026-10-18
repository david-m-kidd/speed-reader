import { readArchive } from './zip';
const scope = self as unknown as { onmessage: (event: MessageEvent<ArrayBuffer>) => void; postMessage: (message: unknown, transfer?: Transferable[]) => void };
scope.onmessage = (event: MessageEvent<ArrayBuffer>) => {
  try {
    const files=readArchive(new Uint8Array(event.data),(done,total)=>scope.postMessage({done,total}));
    scope.postMessage({files},Object.values(files).map(f=>f.buffer as ArrayBuffer));
  } catch(error) { scope.postMessage({error:(error as Error).message}); }
};
