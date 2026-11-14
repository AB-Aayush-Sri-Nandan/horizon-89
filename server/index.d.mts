import type { IncomingMessage, ServerResponse } from "node:http";
export function handleLegacy(req: IncomingMessage, res: ServerResponse): Promise<void>;
