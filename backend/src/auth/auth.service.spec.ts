import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
    let service: AuthService;
    let prisma: PrismaService;
    let jwtService: JwtService;

    const mockPrisma = {
        user: {
            findUnique: jest.fn(),
            create: jest.fn(),
        },
    };

    const mockJwtService = {
        signAsync: jest.fn(),
        verify: jest.fn(),
    };

    const mockConfigService = {
        get: jest.fn((key: string) => {
            const config: Record<string, string> = {
                JWT_SECRET: 'test-secret',
                JWT_REFRESH_SECRET: 'test-refresh-secret',
                JWT_EXPIRATION: '15m',
                JWT_REFRESH_EXPIRATION: '7d',
            };
            return config[key];
        }),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: PrismaService, useValue: mockPrisma },
                { provide: JwtService, useValue: mockJwtService },
                { provide: ConfigService, useValue: mockConfigService },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        prisma = module.get<PrismaService>(PrismaService);
        jwtService = module.get<JwtService>(JwtService);

        jest.clearAllMocks();
    });

    describe('signup', () => {
        it('should create a new user and return tokens', async () => {
            const dto = { name: 'Test User', email: 'test@test.com', password: 'password123' };

            mockPrisma.user.findUnique.mockResolvedValue(null);
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
            mockPrisma.user.create.mockResolvedValue({
                id: '1', name: dto.name, email: dto.email, password: 'hashed-password',
            });
            mockJwtService.signAsync.mockResolvedValueOnce('access-token').mockResolvedValueOnce('refresh-token');

            const result = await service.signup(dto);

            expect(result.user.email).toBe(dto.email);
            expect(result.accessToken).toBe('access-token');
            expect(result.refreshToken).toBe('refresh-token');
            expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 12);
        });

        it('should throw ConflictException if email exists', async () => {
            mockPrisma.user.findUnique.mockResolvedValue({ id: '1' });

            await expect(service.signup({
                name: 'Test', email: 'existing@test.com', password: 'password123',
            })).rejects.toThrow(ConflictException);
        });

        it('should not expose password in response', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(null);
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
            mockPrisma.user.create.mockResolvedValue({
                id: '1', name: 'Test', email: 'test@test.com', password: 'hashed',
            });
            mockJwtService.signAsync.mockResolvedValue('token');

            const result = await service.signup({ name: 'Test', email: 'test@test.com', password: 'pass' });

            expect(result.user).not.toHaveProperty('password');
        });
    });

    describe('login', () => {
        it('should return tokens for valid credentials', async () => {
            mockPrisma.user.findUnique.mockResolvedValue({
                id: '1', name: 'Test', email: 'test@test.com', password: 'hashed',
            });
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            mockJwtService.signAsync.mockResolvedValueOnce('access-token').mockResolvedValueOnce('refresh-token');

            const result = await service.login({ email: 'test@test.com', password: 'password123' });

            expect(result.accessToken).toBe('access-token');
            expect(result.refreshToken).toBe('refresh-token');
            expect(result.user.email).toBe('test@test.com');
        });

        it('should throw UnauthorizedException for invalid email', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(null);

            await expect(service.login({
                email: 'wrong@test.com', password: 'password123',
            })).rejects.toThrow(UnauthorizedException);
        });

        it('should throw UnauthorizedException for invalid password', async () => {
            mockPrisma.user.findUnique.mockResolvedValue({
                id: '1', name: 'Test', email: 'test@test.com', password: 'hashed',
            });
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await expect(service.login({
                email: 'test@test.com', password: 'wrong',
            })).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('refresh', () => {
        it('should return new tokens for valid refresh token', async () => {
            mockJwtService.verify.mockReturnValue({ sub: '1', email: 'test@test.com' });
            mockPrisma.user.findUnique.mockResolvedValue({ id: '1', email: 'test@test.com' });
            mockJwtService.signAsync.mockResolvedValueOnce('new-access').mockResolvedValueOnce('new-refresh');

            const result = await service.refresh('valid-refresh-token');

            expect(result.accessToken).toBe('new-access');
            expect(result.refreshToken).toBe('new-refresh');
        });

        it('should throw UnauthorizedException for invalid refresh token', async () => {
            mockJwtService.verify.mockImplementation(() => { throw new Error(); });

            await expect(service.refresh('invalid')).rejects.toThrow(UnauthorizedException);
        });

        it('should throw UnauthorizedException if user not found from token', async () => {
            mockJwtService.verify.mockReturnValue({ sub: 'deleted-user', email: 'test@test.com' });
            mockPrisma.user.findUnique.mockResolvedValue(null);

            await expect(service.refresh('orphan-token')).rejects.toThrow(UnauthorizedException);
        });
    });
});
