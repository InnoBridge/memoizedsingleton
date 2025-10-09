import express, { Request, Response, NextFunction } from 'express';
import { Request as RequestScoped } from '@/scopes/scopes';
import { initializeRequestContext } from '@/application-context/application_context';
import { Component } from '@/building-blocks/component';

// Define a request-scoped component
@RequestScoped
class UserContext {
    public userId?: string;
    public requestId?: string;

    setUserId(id: string) {
        this.userId = id;
    }

    getUserId() {
        return this.userId;
    }

    setRequestId(id: string) {
        this.requestId = id;
    }

    getRequestId() {
        return this.requestId;
    }
}

@RequestScoped
class RequestLogger {
    private logs: string[] = [];

    log(message: string) {
        this.logs.push(message);
    }

    getLogs() {
        return this.logs;
    }
}

describe('Express Request Scope Integration Tests', () => {
    let app: express.Application;
    let server: any;
    const PORT = 3456;

    beforeAll(() => {
        return new Promise<void>((resolve) => {
            app = express();
            app.use(express.json());

            // Middleware to initialize request scope
            app.use((req: Request, res: Response, next: NextFunction) => {
                initializeRequestContext(() => {
                    next();
                });
            });

            // Middleware to set up user context
            app.use((req: Request, res: Response, next: NextFunction) => {
                const userContext = new UserContext() as UserContext & Component;
                const userId = (req.headers['x-user-id'] as string) || 'anonymous';
                const requestId = (req.headers['x-request-id'] as string) || Math.random().toString(36);
                
                userContext.setUserId(userId);
                userContext.setRequestId(requestId);
                
                next();
            });

            // Test endpoint 1: Get user info
            app.get('/user', (req: Request, res: Response) => {
                const userContext = new UserContext() as UserContext & Component;
                
                res.json({
                    userId: userContext.getUserId(),
                    requestId: userContext.getRequestId(),
                    scope: userContext.getScope()
                });
            });

            // Test endpoint 2: Log and retrieve
            app.post('/log', (req: Request, res: Response) => {
                const logger = new RequestLogger() as RequestLogger & Component;
                const userContext = new UserContext() as UserContext & Component;
                
                logger.log(`User ${userContext.getUserId()} logged message: ${req.body?.message}`);
                
                res.json({
                    logs: logger.getLogs(),
                    userId: userContext.getUserId()
                });
            });

            // Test endpoint 3: Multiple logger calls in same request
            app.get('/multi-log', (req: Request, res: Response) => {
                const logger1 = new RequestLogger() as RequestLogger & Component;
                logger1.log('First log');
                
                const logger2 = new RequestLogger() as RequestLogger & Component;
                logger2.log('Second log');
                
                const logger3 = new RequestLogger() as RequestLogger & Component;
                logger3.log('Third log');
                
                // All should be the same instance
                res.json({
                    logs: logger3.getLogs(),
                    sameInstance: logger1 === logger2 && logger2 === logger3
                });
            });

            server = app.listen(PORT, () => {
                console.log(`Test server listening on port ${PORT}`);
                resolve();
            });
        });
    });

    afterAll(() => {
        return new Promise<void>((resolve) => {
            server.close(() => resolve());
        });
    });

    test('should maintain separate user contexts for different requests', async () => {
        // Make two requests with different user IDs
        const response1 = await fetch(`http://localhost:${PORT}/user`, {
            headers: {
                'x-user-id': 'user-123',
                'x-request-id': 'req-1'
            }
        });
        
        const response2 = await fetch(`http://localhost:${PORT}/user`, {
            headers: {
                'x-user-id': 'user-456',
                'x-request-id': 'req-2'
            }
        });

        const data1 = await response1.json();
        const data2 = await response2.json();

        expect(data1.userId).toBe('user-123');
        expect(data1.requestId).toBe('req-1');
        expect(data1.scope).toBe('REQUEST');

        expect(data2.userId).toBe('user-456');
        expect(data2.requestId).toBe('req-2');
        expect(data2.scope).toBe('REQUEST');
    });

    test('should return same instance within a single request', async () => {
        const response = await fetch(`http://localhost:${PORT}/multi-log`, {
            headers: {
                'x-user-id': 'user-999'
            }
        });

        const data = await response.json();

        expect(data.sameInstance).toBe(true);
        expect(data.logs).toEqual(['First log', 'Second log', 'Third log']);
    });

    test('should isolate logs between different requests', async () => {
        // First request
        const response1 = await fetch(`http://localhost:${PORT}/log`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': 'user-aaa'
            },
            body: JSON.stringify({ message: 'Hello from request 1' })
        });

        const data1 = await response1.json();

        // Second request
        const response2 = await fetch(`http://localhost:${PORT}/log`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': 'user-bbb'
            },
            body: JSON.stringify({ message: 'Hello from request 2' })
        });

        const data2 = await response2.json();

        // Each request should have its own isolated logs
        expect(data1.logs).toHaveLength(1);
        expect(data1.logs[0]).toContain('user-aaa');
        expect(data1.logs[0]).toContain('Hello from request 1');

        expect(data2.logs).toHaveLength(1);
        expect(data2.logs[0]).toContain('user-bbb');
        expect(data2.logs[0]).toContain('Hello from request 2');

        // Logs should NOT contain each other's messages
        expect(data1.logs[0]).not.toContain('request 2');
        expect(data2.logs[0]).not.toContain('request 1');
    });

    test('should handle concurrent requests without interference', async () => {
        // Fire multiple requests concurrently
        const requests = [
            fetch(`http://localhost:${PORT}/user`, {
                headers: { 'x-user-id': 'concurrent-1', 'x-request-id': 'req-c1' }
            }),
            fetch(`http://localhost:${PORT}/user`, {
                headers: { 'x-user-id': 'concurrent-2', 'x-request-id': 'req-c2' }
            }),
            fetch(`http://localhost:${PORT}/user`, {
                headers: { 'x-user-id': 'concurrent-3', 'x-request-id': 'req-c3' }
            }),
            fetch(`http://localhost:${PORT}/user`, {
                headers: { 'x-user-id': 'concurrent-4', 'x-request-id': 'req-c4' }
            }),
            fetch(`http://localhost:${PORT}/user`, {
                headers: { 'x-user-id': 'concurrent-5', 'x-request-id': 'req-c5' }
            })
        ];

        const responses = await Promise.all(requests);
        const data = await Promise.all(responses.map(r => r.json()));

        // Each response should have its own unique user ID
        expect(data[0].userId).toBe('concurrent-1');
        expect(data[1].userId).toBe('concurrent-2');
        expect(data[2].userId).toBe('concurrent-3');
        expect(data[3].userId).toBe('concurrent-4');
        expect(data[4].userId).toBe('concurrent-5');

        // All should have REQUEST scope
        data.forEach(d => {
            expect(d.scope).toBe('REQUEST');
        });
    });
});
