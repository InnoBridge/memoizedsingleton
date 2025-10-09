import express, { Request, Response, NextFunction } from 'express';
import { strict as assert } from 'node:assert';
import { Request as RequestScoped } from '@/scopes/scopes';
import { getApplicationContext, initializeRequestContext } from '@/application-context/application_context';
import { Component, Scope } from '@/building-blocks/component';

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

            const userContext = new UserContext(
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



(async function main() {
    try {
        // sync test

        // promise tests in order
        await startExpressServer();
        await testUserContextPerRequest();


        // const response = await fetch('http://localhost:3456/user');
        // const data = await response.json();
        // console.log(data); // Should log: { message: 'Hello, world!' }
        


        console.log("🎉 All integration tests passed");
    } catch (err) {
        console.error("❌ Integration tests failed:", err);
        process.exit(1);
    }
})();