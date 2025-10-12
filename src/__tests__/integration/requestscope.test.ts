import { Request } from "@/scopes/scopes";
import { initializeRequestContext, hasRequestContext, getApplicationContext } from "@/application-context/application_context";
import { Component } from "@/building-blocks/component";

@Request
class DummyRequest {
    public name: string;
    public instanceId: number;
    private static instanceCount = 0;
    
    constructor(name?: string) {
        DummyRequest.instanceCount++;
        this.instanceId = DummyRequest.instanceCount;
        this.name = name || "DummyRequestInstance";
        console.log(`  → DummyRequest constructor called (instance #${this.instanceId}, name: ${this.name})`);
    }
    
    static resetCount() {
        DummyRequest.instanceCount = 0;
    }
}

@Request
class UserContext {
    public userId?: string;
    private static instanceCount = 0;
    public instanceId: number;
    
    constructor() {
        UserContext.instanceCount++;
        this.instanceId = UserContext.instanceCount;
        console.log(`  → UserContext constructor called (instance #${this.instanceId})`);
    }
    
    setUserId(id: string) {
        this.userId = id;
    }
    
    getUserId() {
        return this.userId;
    }
    
    static resetCount() {
        UserContext.instanceCount = 0;
    }
}

@Request('support')
class QualifiedDummyRequest {
    public name: string;
    public instanceId: number;
    private static instanceCount = 0;

    constructor(name?: string) {
        QualifiedDummyRequest.instanceCount++;
        this.instanceId = QualifiedDummyRequest.instanceCount;
        this.name = name || "QualifiedDummyRequestInstance";
        console.log(`  → QualifiedDummyRequest constructor called (instance #${this.instanceId}, name: ${this.name})`);
    }

    static resetCount() {
        QualifiedDummyRequest.instanceCount = 0;
    }
}

const testRequestScopedBehavior = () => {
    console.log('\n📋 Test 1: RequestScoped decorator ensures one instance per request scope');
    
    DummyRequest.resetCount();

    initializeRequestContext(() => {
        console.log('Inside first request scope...');
        const instance1 = new DummyRequest("first");
        console.log(`  Instance 1 ID: ${instance1.instanceId}, name: ${instance1.name}`);
        
        const instance2 = new DummyRequest("second"); // Should return same instance
        console.log(`  Instance 2 ID: ${instance2.instanceId}, name: ${instance2.name}`);
        
        if (instance1 === instance2) {
            console.log('✅ Both instances are the same object within request scope');
        } else {
            throw new Error('❌ Instances are different - request scope failed!');
        }
        
        if (instance1.name === "first") {
            console.log('✅ Constructor only called once (name is "first", not "second")');
        } else {
            throw new Error(`❌ Constructor called multiple times! Name is "${instance1.name}"`);
        }
    });
    
    console.log('✅ Test 1 passed\n');
};

const testMultipleRequestScopes = () => {
    console.log('📋 Test 2: Different request scopes get different instances');
    
    DummyRequest.resetCount();
    
    let firstScopeInstance: DummyRequest | undefined;
    let secondScopeInstance: DummyRequest | undefined;
    
    initializeRequestContext(() => {
        console.log('Inside first request scope...');
        firstScopeInstance = new DummyRequest("scope1");
        console.log(`  First scope instance ID: ${firstScopeInstance.instanceId}`);
    });
    
    initializeRequestContext(() => {
        console.log('Inside second request scope...');
        secondScopeInstance = new DummyRequest("scope2");
        console.log(`  Second scope instance ID: ${secondScopeInstance.instanceId}`);
    });
    
    if (firstScopeInstance && secondScopeInstance && firstScopeInstance !== secondScopeInstance) {
        console.log('✅ Different request scopes created different instances');
    } else {
        throw new Error('❌ Request scopes sharing instances!');
    }
    
    if (firstScopeInstance.instanceId === 1 && secondScopeInstance.instanceId === 2) {
        console.log('✅ Each scope got a new instance');
    } else {
        throw new Error('❌ Instance IDs incorrect');
    }
    
    console.log('✅ Test 2 passed\n');
};

const testMultipleComponentsInSameScope = () => {
    console.log('📋 Test 3: Multiple different components in same request scope');
    
    DummyRequest.resetCount();
    UserContext.resetCount();

    initializeRequestContext(() => {
        console.log('Creating different component types...');
        
        const request1 = new DummyRequest("req1");
        const user1 = new UserContext();
        user1.setUserId("user123");
        
        const request2 = new DummyRequest("req2"); // Should be same as request1
        const user2 = new UserContext(); // Should be same as user1
        
        if (request1 === request2 && user1 === user2) {
            console.log('✅ Each component type maintains its own singleton within scope');
        } else {
            throw new Error('❌ Component instances not properly scoped!');
        }
        
        if (user2.getUserId() === "user123") {
            console.log('✅ State is preserved across same-type instances');
        } else {
            throw new Error('❌ State not preserved!');
        }
    });
    
    console.log('✅ Test 3 passed\n');
};

const testScopeIsolation = () => {
    console.log('📋 Test 4: Request scopes are isolated from each other');
    
    UserContext.resetCount();
    
    initializeRequestContext(() => {
        const user = new UserContext();
        user.setUserId("user-scope1");
        console.log(`  Scope 1 user ID: ${user.getUserId()}`);
    });
    
    initializeRequestContext(() => {
        const user = new UserContext();
        // Should be new instance, userId should be undefined
        if (user.getUserId() === undefined) {
            console.log('✅ New scope has fresh instance with no state from previous scope');
        } else {
            throw new Error(`❌ State leaked between scopes! Got userId: ${user.getUserId()}`);
        }
        
        user.setUserId("user-scope2");
        console.log(`  Scope 2 user ID: ${user.getUserId()}`);
    });
    
    console.log('✅ Test 4 passed\n');
};

const testHasRequestScope = () => {
    console.log('📋 Test 5: hasRequestContext() utility function');

    if (hasRequestContext()) {
        throw new Error('❌ hasRequestScope() returned true outside of scope!');
    }
    console.log('✅ hasRequestScope() is false outside of scope');
    
    initializeRequestContext(() => {
        if (!hasRequestContext()) {
            throw new Error('❌ hasRequestScope() returned false inside scope!');
        }
        console.log('✅ hasRequestScope() is true inside scope');
    });
    
    if (hasRequestContext()) {
        throw new Error('❌ hasRequestScope() still true after scope ended!');
    }
    console.log('✅ hasRequestScope() is false after scope ends');
    
    console.log('✅ Test 5 passed\n');
};

const testComponentMethods = () => {
    console.log('📋 Test 6: RequestScoped instances have Component methods');

    initializeRequestContext(() => {
        const request = new DummyRequest() as DummyRequest & Component;
        
        const scope = request.getScope();
        if (scope === 'REQUEST') {
            console.log('✅ Instance has correct scope: REQUEST');
        } else {
            throw new Error(`❌ Wrong scope: ${scope}`);
        }
        
        if (request instanceof Component) {
            console.log('✅ Instance is instanceof Component');
        } else {
            throw new Error('❌ Instance is not instanceof Component');
        }
    });
    
    console.log('✅ Test 6 passed\n');
};

const testNestedScopes = () => {
    console.log('📋 Test 7: Nested request scopes work correctly');
    
    DummyRequest.resetCount();

    initializeRequestContext(() => {
        const outer = new DummyRequest("outer");
        console.log(`  Outer scope instance ID: ${outer.instanceId}`);

        initializeRequestContext(() => {
            const inner = new DummyRequest("inner");
            console.log(`  Inner scope instance ID: ${inner.instanceId}`);
            
            if (outer !== inner) {
                console.log('✅ Nested scope creates new instance');
            } else {
                throw new Error('❌ Nested scope returned outer instance!');
            }
        });
        
        const outerAgain = new DummyRequest("outer-again");
        if (outer === outerAgain) {
            console.log('✅ Outer scope instance still cached after nested scope');
        } else {
            throw new Error('❌ Outer scope lost its instance!');
        }
    });
    
    console.log('✅ Test 7 passed\n');
};

const testAsyncOperations = async () => {
    console.log('📋 Test 8: Request scope works with async operations');
    
    UserContext.resetCount();

    await initializeRequestContext(async () => {
        const user1 = new UserContext();
        user1.setUserId("async-user");
        
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const user2 = new UserContext();
        
        if (user1 === user2 && user2.getUserId() === "async-user") {
            console.log('✅ Request scope preserved across async operations');
        } else {
            throw new Error('❌ Request scope lost after async operation!');
        }
    });
    
    console.log('✅ Test 8 passed\n');
};

const testQualifierSeparation = () => {
    console.log('📋 Test 9: Qualifiers isolate request-scoped instances');

    DummyRequest.resetCount();
    QualifiedDummyRequest.resetCount();

    initializeRequestContext(() => {
        console.log('Inside qualifier test scope...');

        const defaultA = new DummyRequest("default");
        const defaultB = new DummyRequest("default-again");

        const qualifiedA = new QualifiedDummyRequest("support-1");
        const qualifiedB = new QualifiedDummyRequest("support-2");

        if (defaultA === defaultB) {
            console.log('✅ Default qualifier returns same instance within scope');
        } else {
            throw new Error('❌ Default qualifier did not reuse instance');
        }

        if (qualifiedA === qualifiedB) {
            console.log('✅ Named qualifier returns same instance within scope');
        } else {
            throw new Error('❌ Named qualifier did not reuse instance');
        }

        if (!Object.is(defaultA, qualifiedA)) {
            console.log('✅ Default and named qualifiers keep separate instances');
        } else {
            throw new Error('❌ Qualifiers leaked between instances');
        }

        const contextDefault = getApplicationContext(DummyRequest);
        const contextQualifiedDefault = getApplicationContext(QualifiedDummyRequest);
        const contextQualifiedNamed = getApplicationContext(QualifiedDummyRequest, 'support');

        if (!contextQualifiedDefault) {
            console.log('✅ No qualified instance stored under default qualifier');
        } else {
            throw new Error('❌ Qualified instance should not be accessible without qualifier');
        }

        if (contextDefault === defaultA && contextQualifiedNamed === qualifiedA) {
            console.log('✅ Context retrieval respects qualifier separation');
        } else {
            throw new Error('❌ Context retrieval mismatch for qualifiers');
        }
    });

    console.log('✅ Test 9 passed\n');
};


(async function main() {
    try {
        console.log('🚀 Starting Request Scope Integration Tests\n');
        console.log('='.repeat(50));
        
        testRequestScopedBehavior();
        testMultipleRequestScopes();
        testMultipleComponentsInSameScope();
        testScopeIsolation();
        testHasRequestScope();
        testComponentMethods();
        testNestedScopes();
        await testAsyncOperations();
        testQualifierSeparation();
        
        console.log('\n' + '='.repeat(50));
        console.log("🎉 All integration tests passed!");
    } catch (err) {
        console.error("\n" + "=".repeat(50));
        console.error("❌ Integration tests failed:", err);
        process.exit(1);
    }
})();