import { Singleton, Request } from "@/scopes/scopes";
import { Insert } from "@/building-blocks/assembler";
import { strict as assert } from 'node:assert';
import { Component } from "@/building-blocks/component";
import { getApplicationContext, initializeRequestContext } from "@/application-context/application_context";

@Singleton
class TestSingleton {
    getValue() {
        return 'singleton-value';
    }
}

@Singleton
class TestSingleton2 {
    getValue() {
        return 'singleton-value-2';
    }
}

@Singleton('secondary')
class QualifiedTestSingleton {
    getQualifiedValue() {
        return 'qualified-singleton-value';
    }
}

class SingletonTestClass {
    @Insert(TestSingleton)
    testSingleton!: TestSingleton;  // Optional - could be undefined

    getSingleton() : TestSingleton | undefined {
        return this.testSingleton;
    }
}

class OptionalSingletonTestClass {
    @Insert(TestSingleton, true)
    optionalSingleton!: TestSingleton;  // Optional - could be undefined

    getOptionalSingleton() : TestSingleton | undefined {
        return this.optionalSingleton;
    }
}

class ConstructorInjectionTestClass {
    singleton: TestSingleton2;

    constructor(
        singleton: TestSingleton2
    ) {
        this.singleton = singleton;
    }

    getSingleton() : TestSingleton {
        return this.singleton;
    }
}

class ConstructorAndFieldInjectionClass extends ConstructorInjectionTestClass {
    @Insert(TestSingleton)
    fieldSingleton!: TestSingleton;

    getFieldSingleton() : TestSingleton {
        return this.fieldSingleton;
    }
}

@Singleton
class NestedSingletonClass {

    @Insert(TestSingleton)
    testSingleton!: TestSingleton;

    getSingleton() : TestSingleton {
        return this.testSingleton;
    }
}

@Singleton
class OuterSingletonClass {

    @Insert(NestedSingletonClass)
    nestedSingleton!: NestedSingletonClass;

    getNestedSingleton() : NestedSingletonClass {
        return this.nestedSingleton;
    }
}

// Multiple injections in same class
class MultipleInjectionsClass {
    @Insert(TestSingleton)
    singleton1!: TestSingleton;

    @Insert(TestSingleton2)
    singleton2!: TestSingleton2;
}

// Mixed optional and required
class MixedOptionalRequiredClass {
    @Insert(TestSingleton)
    required!: TestSingleton;

    @Insert(TestSingleton2, true)
    optional?: TestSingleton2;
}

class QualifiedSingletonInjectionClass {
    @Insert(QualifiedTestSingleton, false, 'secondary')
    qualified!: QualifiedTestSingleton;

    getQualified() {
        return this.qualified;
    }
}

class MissingQualifierSingletonClass {
    @Insert(QualifiedTestSingleton, false, 'missing')
    missing!: QualifiedTestSingleton;
}

// Request-scoped dependency
@Request
class TestRequest {
    getValue() {
        return 'request-value';
    }
}

@Request('admin')
class QualifiedTestRequest {
    getValue() {
        return 'qualified-request-value';
    }
}

class RequestInjectionClass {
    @Insert(TestRequest)
    testRequest!: TestRequest;

    getRequest(): TestRequest {
        return this.testRequest;
    }
}

class QualifiedRequestInjectionClass {
    @Insert(QualifiedTestRequest, false, 'admin')
    qualifiedRequest!: QualifiedTestRequest;

    getQualifiedRequest(): QualifiedTestRequest {
        return this.qualifiedRequest;
    }
}

// Note: Circular dependencies (A → B, B → A) are not testable with current decorator approach
// because decorators are evaluated during class declaration before both classes are defined.
// This is a JavaScript limitation, not a framework limitation.

// Inheritance chain
class GrandparentClass {
    @Insert(TestSingleton)
    grandparentDep!: TestSingleton;
}

class ParentClass extends GrandparentClass {
    @Insert(TestSingleton2)
    parentDep!: TestSingleton2;
}

class ChildClass extends ParentClass {
    // No additional injections
}

const testSingletonInsertion = () => {
    console.log("Test Singleton insertion \n");
    assert.throws(() => {
        new SingletonTestClass();
    }, "Failed to inject SingletonTestClass: No instance of TestSingleton found in application context. Make sure the dependency is decorated with @Singleton or @Request and has been instantiated.");
    console.log('✅ Throws error if singleton not found and not optional');

    // Create the singleton first
    const singleton = new TestSingleton() as TestSingleton & Component;
    console.log("Created singleton:", singleton);
    const instance = new SingletonTestClass();
    console.log("Instance:", instance);
    console.log("Injected singleton:", instance.getSingleton());

    assert.equal(instance.getSingleton(), singleton, "Injected singleton does not match created singleton");
    console.log('✅ Injected singleton matches created singleton');
    singleton.stop();
    console.log("🎉 testSingletonInsertion passed");
    console.log("================================\n");
};

const testOptionalSingletonInsertion = () => {
    console.log("\nTest Optional Singleton insertion \n");
    const instance = new OptionalSingletonTestClass();
    console.log("Instance:", instance);

    assert.equal(instance.getOptionalSingleton(), undefined, "Injected optional singleton should be undefined");
    console.log('✅ Injected optional singleton is undefined');

    const singleton = new TestSingleton() as TestSingleton & Component;
    const instanceWithSingleton = new OptionalSingletonTestClass();
    console.log("Instance with singleton:", instanceWithSingleton);
    console.log("Injected optional singleton:", instanceWithSingleton.getOptionalSingleton());
    
    assert.equal(instanceWithSingleton.getOptionalSingleton(), singleton, "Injected optional singleton does not match created singleton");
    console.log('✅ Injected optional singleton matches created singleton');
    singleton.stop();

    console.log("🎉 testOptionalSingletonInsertion passed");
    console.log("================================\n");
};

const testConstructorInjection = () => {
    console.log("\nTest Constructor injection \n");
    
    // Create singleton first
    const singleton = new TestSingleton() as TestSingleton & Component;
    console.log("Created singleton:", singleton);
    
    // Manual constructor injection
    const instance = new ConstructorInjectionTestClass(singleton);
    console.log("Instance with constructor injection:", instance);
    console.log("Injected singleton via constructor:", instance.getSingleton());
    
    assert.equal(instance.getSingleton(), singleton, "Constructor injected singleton does not match created singleton");
    console.log('✅ Constructor injected singleton matches created singleton');
    
    singleton.stop();
    console.log("🎉 testConstructorInjection passed");
    console.log("================================\n");
};

const testConstructorAndFieldInjection = () => {
    console.log("\nTest Constructor and Field injection \n");

    // Create singleton first
    const constructorSingleton = new TestSingleton2() as TestSingleton2 & Component;
    const fieldSingleton = new TestSingleton() as TestSingleton & Component;
    console.log("Created singleton:", constructorSingleton);

    // Manual constructor injection
    const instance = new ConstructorAndFieldInjectionClass(constructorSingleton);
    console.log("Instance with constructor and field injection:", instance);
    console.log("Injected singleton via constructor:", instance.getSingleton());
    console.log("Injected singleton via field:", instance.getFieldSingleton());

    assert.equal(instance.getSingleton(), constructorSingleton, "Constructor injected singleton does not match created singleton");
    assert.equal(instance.getFieldSingleton(), fieldSingleton, "Field injected singleton does not match created singleton");
    console.log('✅ Constructor and field injected singletons match created singleton');

    constructorSingleton.stop();
    fieldSingleton.stop();
    console.log("🎉 testConstructorAndFieldInjection passed");
    console.log("================================\n");
};

const testNestedSingleton = () => {
    console.log("\nTest Nested Singleton injection \n");

    // Create the inner singleton first
    new TestSingleton();
    new NestedSingletonClass();
    new OuterSingletonClass();

    const outerSingleton = getApplicationContext(OuterSingletonClass);
    console.log("Outer singleton from context:", outerSingleton);
    const nestedSingleton = outerSingleton?.getNestedSingleton();
    console.log("Nested singleton from outer:", nestedSingleton);
    const innerSingleton = nestedSingleton?.getSingleton();
    console.log("Inner singleton from nested:", innerSingleton);

    assert.equal(nestedSingleton, getApplicationContext(NestedSingletonClass), "Nested singleton does not match context instance");
    assert.equal(innerSingleton, getApplicationContext(TestSingleton), "Inner singleton does not match context instance");
    console.log('✅ Nested and inner singletons match context instances');

    outerSingleton?.stop();
    nestedSingleton?.stop();
    innerSingleton?.stop();
    console.log("🎉 testNestedSingleton passed");
    console.log("================================\n");
};

const testMultipleInjections = () => {
    console.log("\nTest Multiple injections in same class \n");

    const singleton1 = new TestSingleton() as TestSingleton & Component;
    const singleton2 = new TestSingleton2() as TestSingleton2 & Component;

    const instance = new MultipleInjectionsClass();
    console.log("Instance with multiple injections:", instance);

    assert.equal(instance.singleton1, singleton1, "First injection doesn't match");
    assert.equal(instance.singleton2, singleton2, "Second injection doesn't match");
    console.log('✅ Multiple injections work correctly');

    singleton1.stop();
    singleton2.stop();
    console.log("🎉 testMultipleInjections passed");
    console.log("================================\n");
};

const testMixedOptionalRequired = () => {
    console.log("\nTest Mixed optional and required injections \n");

    // Only create the required one
    const singleton1 = new TestSingleton() as TestSingleton & Component;

    const instance = new MixedOptionalRequiredClass();
    console.log("Instance with mixed injections:", instance);

    assert.equal(instance.required, singleton1, "Required injection doesn't match");
    assert.equal(instance.optional, undefined, "Optional should be undefined");
    console.log('✅ Mixed optional/required works correctly');

    // Now add the optional one
    const singleton2 = new TestSingleton2() as TestSingleton2 & Component;
    const instance2 = new MixedOptionalRequiredClass();

    assert.equal(instance2.required, singleton1, "Required injection doesn't match");
    assert.equal(instance2.optional, singleton2, "Optional should now be injected");
    console.log('✅ Optional becomes available when instantiated');

    singleton1.stop();
    singleton2.stop();
    console.log("🎉 testMixedOptionalRequired passed");
    console.log("================================\n");
};

const testQualifiedSingletonInjection = () => {
    console.log("\nTest Qualified Singleton injection \n");

    assert.throws(() => {
        new QualifiedSingletonInjectionClass();
    }, /No instance of QualifiedTestSingleton/);
    console.log('✅ Throws error when qualified singleton missing');

    const qualifiedSingleton = new QualifiedTestSingleton() as QualifiedTestSingleton & Component;
    const consumer = new QualifiedSingletonInjectionClass();
    const injected = consumer.getQualified();

    assert.equal(injected, qualifiedSingleton, "Qualified singleton injection did not match context instance");
    assert.equal(injected.getQualifiedValue(), 'qualified-singleton-value');
    console.log('✅ Qualified singleton injected successfully');

    qualifiedSingleton.stop();

    assert.throws(() => {
        new MissingQualifierSingletonClass();
    }, /No instance of QualifiedTestSingleton/);
    console.log('✅ Mismatched qualifier still throws as expected');

    console.log("🎉 testQualifiedSingletonInjection passed");
    console.log("================================\n");
};

const testRequestScopedInjection = () => {
    console.log("\nTest Request-scoped injection \n");

    // Without request context, should fail
    assert.throws(() => {
        new RequestInjectionClass();
    }, "Should throw when request context not initialized");
    console.log('✅ Throws error when request context not initialized');

    // Within request context
    initializeRequestContext(() => {
        new TestRequest();
        const instance = new RequestInjectionClass();
        
        assert.ok(instance.getRequest(), "Request should be injected");
        assert.equal(instance.getRequest().getValue(), 'request-value');
        console.log('✅ Request-scoped injection works within context');
    });

    // Different request context should have different instance
    let request1: TestRequest | undefined;
    let request2: TestRequest | undefined;

    initializeRequestContext(() => {
        request1 = new TestRequest();
        const instance1 = new RequestInjectionClass();
        assert.equal(instance1.getRequest(), request1);
    });

    initializeRequestContext(() => {
        request2 = new TestRequest();
        const instance2 = new RequestInjectionClass();
        assert.equal(instance2.getRequest(), request2);
    });

    assert.notEqual(request1, request2, "Different request contexts should have different instances");
    console.log('✅ Different request contexts are isolated');

    console.log("🎉 testRequestScopedInjection passed");
    console.log("================================\n");
};

const testQualifiedRequestScopedInjection = () => {
    console.log("\nTest Qualified Request-scoped injection \n");

    assert.throws(() => {
        new QualifiedRequestInjectionClass();
    }, /QualifiedTestRequest/);
    console.log('✅ Throws error when qualified request dependency missing');

    initializeRequestContext(() => {
        assert.throws(() => {
            new QualifiedRequestInjectionClass();
        }, /QualifiedTestRequest/);
        console.log('✅ Even inside scope, dependency must be instantiated first');

        new QualifiedTestRequest();
        const consumer = new QualifiedRequestInjectionClass();
        const injected = consumer.getQualifiedRequest();

        assert.equal(injected.getValue(), 'qualified-request-value');
        console.log('✅ Qualified request injected successfully once available');
    });

    console.log("🎉 testQualifiedRequestScopedInjection passed");
    console.log("================================\n");
};

const testSingletonStability = () => {
    console.log("\nTest Singleton stability \n");

    const singleton = new TestSingleton() as TestSingleton & Component;
    const instance1 = new SingletonTestClass();
    const instance2 = new SingletonTestClass();

    // Both should get the same singleton instance
    assert.equal(instance1.getSingleton(), singleton);
    assert.equal(instance2.getSingleton(), singleton);
    assert.equal(instance1.getSingleton(), instance2.getSingleton());
    console.log('✅ Same singleton returned to multiple consumers');

    singleton.stop();
    console.log("🎉 testSingletonStability passed");
    console.log("================================\n");
};

const testInheritanceChain = () => {
    console.log("\nTest Inheritance chain \n");

    const singleton1 = new TestSingleton() as TestSingleton & Component;
    const singleton2 = new TestSingleton2() as TestSingleton2 & Component;

    const child = new ChildClass();

    assert.equal(child.grandparentDep, singleton1, "Grandparent dependency not injected");
    assert.equal(child.parentDep, singleton2, "Parent dependency not injected");
    console.log('✅ Inherited injections work through class hierarchy');

    singleton1.stop();
    singleton2.stop();
    console.log("🎉 testInheritanceChain passed");
    console.log("================================\n");
};

const testErrorMessages = () => {
    console.log("\nTest Error messages \n");

    try {
        new SingletonTestClass();
        assert.fail("Should have thrown error");
    } catch (err: any) {
        assert.ok(err.message.includes('TestSingleton'), "Error should mention missing type");
        assert.ok(err.message.includes('application context'), "Error should mention context");
        console.log('✅ Error message is informative:', err.message);
    }

    console.log("🎉 testErrorMessages passed");
    console.log("================================\n");
};

(async function main() {
    try {
        testSingletonInsertion();
        testOptionalSingletonInsertion();
        testConstructorInjection();
        testConstructorAndFieldInjection();
        testNestedSingleton();
        testMultipleInjections();
        testMixedOptionalRequired();
    testQualifiedSingletonInjection();
        testRequestScopedInjection();
    testQualifiedRequestScopedInjection();
        testSingletonStability();
        testInheritanceChain();
        testErrorMessages();

        console.log('✅ @Insert decorator works correctly');
        console.log("🎉 All integration tests passed");
    } catch (err) {
        console.error("❌ Integration tests failed:", err);
        process.exit(1);
    }
})();