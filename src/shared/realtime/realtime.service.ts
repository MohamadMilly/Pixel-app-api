import type { Server as HttpServer } from 'node:http';
import { Server as SocketServer, type Socket } from 'socket.io';
import { env } from '../../config/env.js';
import { verifyAccessToken, type AccessTokenPayload } from '../security/jwt.js';

/** Room name for an account — every socket of that account joins it. */
export function accountRoom(accountId: number): string {
  return `account:${accountId}`;
}

interface Presence {
  readonly sockets: Set<string>;
}

interface AuthedSocketData {
  accountId: number;
  role: AccessTokenPayload['role'];
  profileId: number;
}

/**
 * Socket.io wrapper.
 * - Authenticates every connection with the JWT during the handshake.
 * - Joins each socket to its `account:<id>` room, so emitting to a user/library by id is trivial.
 * - Tracks presence in an in-memory Map keyed by accountId; multiple devices for one account
 *   count as one online account with a device `count`.
 */
export class RealtimeService {
  private io: SocketServer | null = null;
  private readonly presence = new Map<number, Presence>();

  init(httpServer: HttpServer): SocketServer {
    const io = new SocketServer(httpServer, {
      cors: { origin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(',').map((o) => o.trim()) },
    });

    // Handshake auth: token from `auth.token` or the Authorization header.
    io.use((socket, next) => {
      try {
        const raw =
          (typeof socket.handshake.auth?.['token'] === 'string' ? socket.handshake.auth['token'] : undefined) ??
          socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, '');
        if (!raw) {
          next(new Error('UNAUTHORIZED'));
          return;
        }
        const payload = verifyAccessToken(raw.trim());
        const data: AuthedSocketData = { accountId: payload.accountId, role: payload.role, profileId: payload.id };
        Object.assign(socket.data, data);
        next();
      } catch {
        next(new Error('UNAUTHORIZED'));
      }
    });

    io.on('connection', (socket) => this.onConnection(socket));
    this.io = io;
    return io;
  }

  private onConnection(socket: Socket): void {
    const { accountId } = socket.data as AuthedSocketData;
    void socket.join(accountRoom(accountId));
    this.track(accountId, socket.id);

    socket.on('disconnect', () => this.untrack(accountId, socket.id));
  }

  /** Emit an event to every device of one account. No-op if realtime isn't initialised. */
  emitToAccount(accountId: number, event: string, payload: unknown): void {
    this.io?.to(accountRoom(accountId)).emit(event, payload);
  }

  /** How many live sockets (devices) the account has; 0 when offline. */
  connectionCount(accountId: number): number {
    return this.presence.get(accountId)?.sockets.size ?? 0;
  }

  isOnline(accountId: number): boolean {
    return this.connectionCount(accountId) > 0;
  }

  private track(accountId: number, socketId: string): void {
    const entry = this.presence.get(accountId);
    if (entry) {
      entry.sockets.add(socketId);
    } else {
      this.presence.set(accountId, { sockets: new Set([socketId]) });
    }
  }

  private untrack(accountId: number, socketId: string): void {
    const entry = this.presence.get(accountId);
    if (!entry) return;
    entry.sockets.delete(socketId);
    if (entry.sockets.size === 0) {
      this.presence.delete(accountId);
    }
  }
}
