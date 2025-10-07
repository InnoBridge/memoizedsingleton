import { getApplicationContext } from "@/application-context/application_context";
import { Singleton } from "@/scopes/scopes";
import { Component, SingletonComponent } from "@/building-blocks/component";

@Singleton
class DummySingleton {
    public name: string;
    public instanceId: number;
    private static instanceCount = 0;

    constructor() {
        DummySingleton.instanceCount++;
        this.instanceId = DummySingleton.instanceCount;
        this.name = "DummySingletonInstance";
        console.log(`  → DummySingleton constructor called (instance #${this.instanceId})`);
    }
}

const testSingletonBehavior = () => {
    console.log('\n📋 Test 1: Singleton decorator prevents multiple instances');
    
    // Create multiple instances
    console.log('Creating first instance...');
    const instance1 = new DummySingleton() as DummySingleton & Component;
    console.log("Singleton ", instance1);
    const singletonInstance = instance1;
    console.log("Scope ", singletonInstance.getScope());

    console.log(`Is instance1 a Component? ${instance1 instanceof Component}`);
    console.log(`Is instance1 a SingletonComponent? ${instance1 instanceof SingletonComponent}`);
    console.log(`Is instance1 a DummySingleton? ${instance1 instanceof DummySingleton}`);

    console.log(`  Instance 1 ID: ${instance1.instanceId}`);
    
    console.log('Creating second instance (should return first)...');
    const instance2 = new DummySingleton();
    console.log(`  Instance 2 ID: ${instance2.instanceId}`);
    
    console.log('Creating third instance (should return first)...');
    const instance3 = new DummySingleton();
    console.log(`  Instance 3 ID: ${instance3.instanceId}`);
    
    // Verify they're the same instance
    if (instance1 === instance2 && instance2 === instance3) {
        console.log('✅ All instances are the same object (singleton works!)');
    } else {
        throw new Error('❌ Instances are different - singleton failed!');
    }
    
    // Verify only one constructor call happened
    if (instance1.instanceId === 1 && instance2.instanceId === 1 && instance3.instanceId === 1) {
        console.log('✅ Constructor was only called once');
    } else {
        throw new Error('❌ Constructor was called multiple times');
    }

    instance1.stop();
};

const testApplicationContext = () => {
    console.log('\n📋 Test 2: Instance is stored in application context');

    console.log('Getting instance before initialization (should be undefined)...');
    const preInstance = getApplicationContext(DummySingleton);
    console.log(`  Pre-initialization instance: ${preInstance}`);
    
    const instance = new DummySingleton();
    const contextInstance = getApplicationContext(DummySingleton);
    
    console.log(`  Instance from new: ${instance.name} (ID: ${instance.instanceId})`);
    console.log(`  Instance from context: ${contextInstance?.name} (ID: ${contextInstance?.instanceId})`);
    
    if (contextInstance && instance === contextInstance) {
        console.log('✅ Application context returns the same instance');
    } else {
        throw new Error('❌ Application context instance mismatch');
    }
    contextInstance.stop();
};

const testModifyingInstance = () => {
    console.log('\n📋 Test 3: Modifications persist across "new" calls');
    
    const instance1 = new DummySingleton();
    instance1.name = "Modified Name";
    console.log(`  Modified instance1.name to: "${instance1.name}"`);
    
    const instance2 = new DummySingleton() as (DummySingleton & Component);
    console.log(`  instance2.name is: "${instance2.name}"`);
    
    if (instance2.name === "Modified Name") {
        console.log('✅ Modifications persist (proving singleton behavior)');
    } else {
        throw new Error('❌ Modifications did not persist');
    }
    instance2.stop();
};

const testClearingContext = () => {
    console.log('\n📋 Test 4: Clearing application context allows new instance')
    new DummySingleton()
    const instanceFromContextBeforeClear = getApplicationContext(DummySingleton);
    console.log(`  Instance from context before clear: ${instanceFromContextBeforeClear?.name} (ID: ${instanceFromContextBeforeClear?.instanceId})`);
    instanceFromContextBeforeClear?.stop(); // This should clear the context
    const instanceAfterClear = getApplicationContext(DummySingleton);
    console.log(`  Instance from context after clear: ${instanceAfterClear}`);
};

(async function main() {
    try {
        console.log('🚀 Starting Singleton Integration Tests\n');
        console.log('='.repeat(50));

        // testSingletonBehavior();
        // testApplicationContext();
        // testModifyingInstance();
        testClearingContext();
        
        console.log('\n' + '='.repeat(50));
        console.log("🎉 All integration tests passed");
    } catch (err) {
        console.error("\n" + "=".repeat(50));
        console.error("❌ Integration tests failed:", err);
        process.exit(1);
    }
})();