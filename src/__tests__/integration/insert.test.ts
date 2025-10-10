import { Singleton } from "@/scopes/scopes";
import { Insert } from "@/building-blocks/assembler";
import { strict as assert } from 'node:assert';
import { Component } from "@/building-blocks/component";
import { getApplicationContext } from "@/application-context/application_context";
import { get } from "node:http";

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

(async function main() {
    try {
        testSingletonInsertion();
        testOptionalSingletonInsertion();
        testConstructorInjection();
        testConstructorAndFieldInjection();
        testNestedSingleton();

        console.log('✅ @Insert decorator works correctly');
        console.log("🎉 All integration tests passed");
    } catch (err) {
        console.error("❌ Integration tests failed:", err);
        process.exit(1);
    }
})();