import { RealtimeService, accountRoom } from './realtime.service.js';

export { RealtimeService, accountRoom };

/** Process-wide realtime singleton; `init(httpServer)` is called once from server.ts. */
export const realtime = new RealtimeService();
