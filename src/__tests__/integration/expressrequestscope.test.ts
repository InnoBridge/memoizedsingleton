import express, { Request, Response, NextFunction } from 'express';
import { strict as assert } from 'node:assert';
import { Request as RequestScoped } from '@/scopes/scopes';
import { getApplicationContext, initializeRequestContext } from '@/application-context/application_context';
import { Component, Scope } from '@/building-blocks/component';

const BASEURL = 'http://localhost';
const PORT = 3456;

// Define a request-scoped component
@RequestScoped
class UserContext {
    public userId?: string;
    public requestId?: string;

    constructor(userMetadata?: {
        userId?: string;
        requestId?: string;
    }) {
        this.userId = userMetadata?.userId;
        this.requestId = userMetadata?.requestId;
    }

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

const localFetch = async (
    baseUrl: string, 
    port: number, 
    endpoint: string,
    headers?: Record<string, string>,
    method?: string,
    body?: any
) => {
    const response = await fetch(`${baseUrl}:${port}${endpoint}`, {
        headers: {
            ...headers
        },
        method: method,
        body: JSON.stringify(body)
    });
    return response;
};

const startExpressServer = async () => {
    let app: express.Application;
    let server: any;

    return new Promise<void>((resolve) => {
        app = express();
        app.use(express.json());

        // Initialize request scope container
        app.use((req: Request, res: Response, next: NextFunction) => {
            initializeRequestContext(() => {
                next();
            });
        });

        // Middleware to set up user context
        app.use((req: Request, res: Response, next: NextFunction) => {
            const userId = (req.headers['x-user-id'] as string) || 'anonymous';
            const requestId = (req.headers['x-request-id'] as string) || 'req-' + Math.random().toString(36).substring(2, 15);

            new UserContext(
                { 
                    userId: userId,
                    requestId: requestId
                }
            );
            next();
        });

        // Get user info endpoint
        app.get('/user', (req: Request, res: Response) => {
            new UserContext();

            const userContext = getApplicationContext(UserContext) as UserContext & Component;

            console.log("userContext:", userContext);

            res.json({
                userId: userContext.getUserId(),
                requestId: userContext.getRequestId(),
                scope: userContext.getScope()
            });
        });

        // Log and retrieve endpoint
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
        app.post('/multi-log', (req: Request, res: Response) => {
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
            console.log(`Express server running on http://localhost:${PORT}`);
            resolve();
        });

    });
};

const testUserContextPerRequest = async () => {
    console.log('Starting testUserContextPerRequest: UserContext is unique per request');
    console.log('----------------------------------------------\n');
    // Make two requests with different user IDs
    const response1 = await localFetch(
        BASEURL, PORT, '/user',            
        {
                'x-user-id': 'user-123',
                'x-request-id': 'req-1'
        }
    );

    const response2 = await localFetch(
        BASEURL, PORT, '/user', {
            'x-user-id': 'user-456',
            'x-request-id': 'req-2'
        }
    );

    const data1 = await response1.json();
    console.log("Response 1:", data1); // Should log: { userId: 'user-123', requestId: 'req-1' }
    const data2 = await response2.json();
    console.log("Response 2:", data2); // Should log: { userId: 'user-456', requestId: 'req-2' }

    assert.strictEqual(data1.userId, 'user-123');
    assert.strictEqual(data1.requestId, 'req-1');
    assert.strictEqual(data1.scope, Scope.REQUEST);

    assert.strictEqual(data2.userId, 'user-456');
    assert.strictEqual(data2.requestId, 'req-2');
    assert.strictEqual(data2.scope, Scope.REQUEST);

    console.log('✅ testUserContextPerRequest passed');
    console.log('----------------------------------------------\n');
}

const testReturnSameInstanceWithinSingleRequest = async () => {
    console.log('Starting testReturnSameInstanceWithinSingleRequest: Same instance within a request');
    console.log('----------------------------------------------\n');

    const response = await localFetch(
        BASEURL, PORT, '/multi-log', {
            'x-user-id': 'user-999',
        },
        'POST'
    );

    const data = await response.json();
    console.log("Response:", data); // Should log: { sameInstance: true }
    
    assert.strictEqual(data.sameInstance, true);
    assert.deepStrictEqual(data.logs, ['First log', 'Second log', 'Third log']);
    
    console.log('✅ testReturnSameInstanceWithinSingleRequest passed');
    console.log('----------------------------------------------\n');
};

const testReturnSameInstanceWithinMultipleRequest = async () => {
    console.log('Starting testReturnSameInstanceWithinMultipleRequest: Isolated instances between requests');
    console.log('----------------------------------------------\n');

    // First request
    const response1 = await localFetch(
        BASEURL, PORT, '/log', {
            'Content-Type': 'application/json',
            'x-user-id': 'user-111',
        },
        'POST',
        { message: 'Hello from request 1' }
    );

    const data1 = await response1.json();
    console.log("Response 1:", data1); // Should log: { sameInstance: true, logs: [...] }

    // Second request
    const response2 = await localFetch(
        BASEURL, PORT, '/log', {
            'Content-Type': 'application/json',
            'x-user-id': 'user-222',
        },
        'POST',
        { message: 'Hello from request 2' }
    );

    const data2 = await response2.json();
    console.log("Response 2:", data2); // Should log: { sameInstance: true, logs: [...] }

    assert.equal(data1.logs.length, 1);
    assert.equal(data1.userId, 'user-111');
    assert.equal(data1.logs[0].includes('Hello from request 1'), true);
    
    assert.equal(data2.logs.length, 1);
    assert.equal(data2.userId, 'user-222');
    assert.equal(data2.logs[0].includes('Hello from request 2'), true);

    // Logs should NOT contain each other's messages
    assert.equal(data1.logs[0].includes('request 2'), false);
    assert.equal(data2.logs[0].includes('request 1'), false);

    console.log('✅ testReturnSameInstanceWithinMultipleRequest passed');
    console.log('----------------------------------------------\n');
};

const testHandleConcurrentRequestsWithoutInterference = async () => {
    console.log('Starting testHandleConcurrentRequestsWithoutInterference: Concurrent requests isolation');
    console.log('----------------------------------------------\n');

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
    const data = await Promise.all(responses.map(res => res.json()));

    // Each response should have its own unique user ID
    assert.equal(data[0].userId, 'concurrent-1');
    assert.equal(data[1].userId, 'concurrent-2');
    assert.equal(data[2].userId, 'concurrent-3');
    assert.equal(data[3].userId, 'concurrent-4');
    assert.equal(data[4].userId, 'concurrent-5');

    // All should be REQUEST scope
    data.forEach(d => {
        assert.equal(d.scope, Scope.REQUEST);
    });

    console.log('✅ testHandleConcurrentRequestsWithoutInterference passed');
    console.log('----------------------------------------------\n');
};

(async function main() {
    try {
        // sync test

        // promise tests in order
        await startExpressServer();
        await testUserContextPerRequest();
        await testReturnSameInstanceWithinSingleRequest();
        await testReturnSameInstanceWithinMultipleRequest();
        await testHandleConcurrentRequestsWithoutInterference();

        console.log("🎉 All integration tests passed");
    } catch (err) {
        console.error("❌ Integration tests failed:", err);
        process.exit(1);
    }
})();