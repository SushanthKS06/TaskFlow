import { Test, TestingModule } from '@nestjs/testing';
import { EventsGateway } from './events.gateway';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('EventsGateway', () => {
    let gateway: EventsGateway;

    const mockJwtService = {
        verify: jest.fn(),
    };

    const mockConfigService = {
        get: jest.fn((key: string) => {
            if (key === 'JWT_SECRET') return 'test-secret';
            return undefined;
        }),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EventsGateway,
                { provide: JwtService, useValue: mockJwtService },
                { provide: ConfigService, useValue: mockConfigService },
            ],
        }).compile();

        gateway = module.get<EventsGateway>(EventsGateway);

        // Mock the WebSocket server
        gateway.server = {
            to: jest.fn().mockReturnThis(),
            except: jest.fn().mockReturnThis(),
            emit: jest.fn(),
        } as any;

        jest.clearAllMocks();
    });

    describe('handleConnection', () => {
        it('should authenticate valid client and track connection', async () => {
            const mockClient = {
                id: 'socket-1',
                handshake: { auth: { token: 'valid-token' }, headers: {} },
                disconnect: jest.fn(),
            } as any;

            mockJwtService.verify.mockReturnValue({ sub: 'user-1', email: 'test@test.com' });

            await gateway.handleConnection(mockClient);

            expect(mockJwtService.verify).toHaveBeenCalledWith('valid-token', { secret: 'test-secret' });
            expect(mockClient.disconnect).not.toHaveBeenCalled();
        });

        it('should disconnect client with no token', async () => {
            const mockClient = {
                id: 'socket-2',
                handshake: { auth: {}, headers: {} },
                disconnect: jest.fn(),
            } as any;

            await gateway.handleConnection(mockClient);

            expect(mockClient.disconnect).toHaveBeenCalled();
        });

        it('should disconnect client with invalid token', async () => {
            const mockClient = {
                id: 'socket-3',
                handshake: { auth: { token: 'invalid' }, headers: {} },
                disconnect: jest.fn(),
            } as any;

            mockJwtService.verify.mockImplementation(() => {
                throw new Error('Invalid token');
            });

            await gateway.handleConnection(mockClient);

            expect(mockClient.disconnect).toHaveBeenCalled();
        });
    });

    describe('handleDisconnect', () => {
        it('should clean up user tracking on disconnect', async () => {
            // First connect
            const mockClient = {
                id: 'socket-1',
                handshake: { auth: { token: 'valid-token' }, headers: {} },
                disconnect: jest.fn(),
            } as any;

            mockJwtService.verify.mockReturnValue({ sub: 'user-1' });
            await gateway.handleConnection(mockClient);

            // Then disconnect
            gateway.handleDisconnect(mockClient);

            // Verify user socket tracking is cleaned up
            const socketIds = gateway.getSocketIdsForUser('user-1');
            expect(socketIds).toHaveLength(0);
        });
    });

    describe('handleJoinBoard', () => {
        it('should join the board room', () => {
            const mockClient = {
                id: 'socket-1',
                join: jest.fn(),
            } as any;

            const result = gateway.handleJoinBoard(mockClient, { boardId: 'board-1' });

            expect(mockClient.join).toHaveBeenCalledWith('board:board-1');
            expect(result).toEqual({ event: 'joined', boardId: 'board-1' });
        });
    });

    describe('handleLeaveBoard', () => {
        it('should leave the board room', () => {
            const mockClient = {
                id: 'socket-1',
                leave: jest.fn(),
            } as any;

            const result = gateway.handleLeaveBoard(mockClient, { boardId: 'board-1' });

            expect(mockClient.leave).toHaveBeenCalledWith('board:board-1');
            expect(result).toEqual({ event: 'left', boardId: 'board-1' });
        });
    });

    describe('emitToBoard', () => {
        it('should emit event to all clients in board room', () => {
            const mockTo = jest.fn().mockReturnValue({ emit: jest.fn() });
            gateway.server.to = mockTo;

            gateway.emitToBoard('board-1', 'task:created', { id: 'task-1' });

            expect(mockTo).toHaveBeenCalledWith('board:board-1');
        });
    });

    describe('emitToBoardExcept', () => {
        it('should emit to all when no excludeUserId', () => {
            const mockEmit = jest.fn();
            const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });
            gateway.server.to = mockTo;

            gateway.emitToBoardExcept('board-1', 'task:updated', { id: 'task-1' });

            expect(mockTo).toHaveBeenCalledWith('board:board-1');
            expect(mockEmit).toHaveBeenCalledWith('task:updated', { id: 'task-1' });
        });

        it('should exclude user sockets when excludeUserId provided', async () => {
            // Connect a user first
            const mockClient = {
                id: 'socket-1',
                handshake: { auth: { token: 'token' }, headers: {} },
                disconnect: jest.fn(),
            } as any;
            mockJwtService.verify.mockReturnValue({ sub: 'user-1' });
            await gateway.handleConnection(mockClient);

            const mockEmit = jest.fn();
            const mockExcept = jest.fn().mockReturnValue({ emit: mockEmit });
            const mockTo = jest.fn().mockReturnValue({ except: mockExcept });
            gateway.server.to = mockTo;

            gateway.emitToBoardExcept('board-1', 'task:updated', { id: 'task-1' }, 'user-1');

            expect(mockTo).toHaveBeenCalledWith('board:board-1');
            expect(mockExcept).toHaveBeenCalledWith('socket-1');
        });
    });

    describe('getSocketIdsForUser', () => {
        it('should return empty array for unknown user', () => {
            expect(gateway.getSocketIdsForUser('unknown')).toEqual([]);
        });

        it('should return socket IDs for connected user', async () => {
            const mockClient = {
                id: 'socket-1',
                handshake: { auth: { token: 'token' }, headers: {} },
                disconnect: jest.fn(),
            } as any;
            mockJwtService.verify.mockReturnValue({ sub: 'user-1' });
            await gateway.handleConnection(mockClient);

            const socketIds = gateway.getSocketIdsForUser('user-1');
            expect(socketIds).toContain('socket-1');
        });
    });
});
