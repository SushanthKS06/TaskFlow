import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    ConnectedSocket,
    MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
    cors: {
        origin: '*',
        credentials: true,
    },
    namespace: '/',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(EventsGateway.name);
    private connectedUsers = new Map<string, string>(); // socketId -> userId
    private userSockets = new Map<string, Set<string>>(); // userId -> Set<socketId>

    constructor(
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }

    async handleConnection(client: Socket) {
        try {
            const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
            if (!token) {
                client.disconnect();
                return;
            }

            const payload = this.jwtService.verify(token, {
                secret: this.configService.get<string>('JWT_SECRET'),
            });

            const userId = payload.sub;
            this.connectedUsers.set(client.id, userId);

            // Track user -> sockets mapping
            if (!this.userSockets.has(userId)) {
                this.userSockets.set(userId, new Set());
            }
            this.userSockets.get(userId)!.add(client.id);

            this.logger.log(`Client connected: ${client.id} (User: ${userId})`);
        } catch {
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        const userId = this.connectedUsers.get(client.id);
        if (userId) {
            this.userSockets.get(userId)?.delete(client.id);
            if (this.userSockets.get(userId)?.size === 0) {
                this.userSockets.delete(userId);
            }
        }
        this.connectedUsers.delete(client.id);
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('join:board')
    handleJoinBoard(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { boardId: string },
    ) {
        client.join(`board:${data.boardId}`);
        this.logger.log(`Client ${client.id} joined board:${data.boardId}`);
        return { event: 'joined', boardId: data.boardId };
    }

    @SubscribeMessage('leave:board')
    handleLeaveBoard(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { boardId: string },
    ) {
        client.leave(`board:${data.boardId}`);
        this.logger.log(`Client ${client.id} left board:${data.boardId}`);
        return { event: 'left', boardId: data.boardId };
    }

    // Get all socket IDs for a user
    getSocketIdsForUser(userId: string): string[] {
        return Array.from(this.userSockets.get(userId) || []);
    }

    // Emit events to all clients in a board room
    emitToBoard(boardId: string, event: string, data: any) {
        this.server.to(`board:${boardId}`).emit(event, data);
    }

    // Emit to all clients in room except the originating user's sockets
    emitToBoardExcept(boardId: string, event: string, data: any, excludeUserId?: string) {
        if (excludeUserId) {
            const socketIds = this.getSocketIdsForUser(excludeUserId);
            let emitter: any = this.server.to(`board:${boardId}`);
            for (const socketId of socketIds) {
                emitter = emitter.except(socketId);
            }
            emitter.emit(event, data);
        } else {
            this.server.to(`board:${boardId}`).emit(event, data);
        }
    }
}
