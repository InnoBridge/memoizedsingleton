import { Singleton, Request } from "@/scopes/scopes";
import { Insert } from "@/building-blocks/assembler";
import { strict as assert } from 'node:assert';
import { Component } from "@/building-blocks/component";

@Singleton
class TestSingleton {
    getValue() {
        return 'singleton-value';
    }
}

@Request
class TestRequest {
    getValue() {
        return 'request-value';
    }
}

class BaseTestClass {

}

class SingletonTestClass extends BaseTestClass {
    @Insert(TestSingleton)
    testSingleton!: TestSingleton;  // Optional - could be undefined

    getSingleton() : TestSingleton | undefined {
        return this.testSingleton;
    }
}

class OptionalSingletonTestClass extends BaseTestClass {
    @Insert(TestSingleton, true)
    optionalSingleton!: TestSingleton;  // Optional - could be undefined

    getOptionalSingleton() : TestSingleton | undefined {
        return this.optionalSingleton;
    }
}

class ConstructorInjectionTestClass extends BaseTestClass {
    singleton: TestSingleton;

    constructor(
        singleton: TestSingleton
    ) {
        super();
        this.singleton = singleton;
    }

    getSingleton() : TestSingleton {
        return this.singleton;
    }
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

(async function main() {
    try {
        // Create the singleton first
        testSingletonInsertion();
        testOptionalSingletonInsertion();

        // What we want:
        // const testClass = new TestClass();  // Auto        
        // Create TestClass - dependency should be auto-injected
        // const testInstance = new TestClass();
        
        // console.log("TestClass instance:", testInstance);

        // const testSingleton = testInstance.getSingleton();
        // console.log("Injected singleton:", testSingleton);

        // const testRequest = testInstance.getRequest();
        // console.log("Injected request (should fail outside request context):", testRequest);

        console.log('✅ @Insert decorator works correctly');
        console.log("🎉 All integration tests passed");
    } catch (err) {
        console.error("❌ Integration tests failed:", err);
        process.exit(1);
    }
})();