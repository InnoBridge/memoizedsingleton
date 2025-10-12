import { Prototype } from "@/scopes/scopes";
import { Component, PrototypeComponent, Scope } from "@/building-blocks/component";
import { getApplicationContext } from "@/application-context/application_context";

@Prototype
class DummyPrototype {
    public readonly label: string;
    public readonly instanceId: number;
    private static instanceCount = 0;

    constructor(label = "prototype") {
        DummyPrototype.instanceCount++;
        this.instanceId = DummyPrototype.instanceCount;
        this.label = `${label}-${this.instanceId}`;
        console.log(`  → DummyPrototype constructor called (instance #${this.instanceId})`);
    }

    static resetCount() {
        DummyPrototype.instanceCount = 0;
    }
}

const testPrototypeCreatesFreshInstances = () => {
    console.log("\n📋 Test 1: Prototype decorator returns a fresh instance per construction");

    DummyPrototype.resetCount();

    const instanceA = new DummyPrototype();
    const instanceB = new DummyPrototype();

    if (instanceA === instanceB) {
        throw new Error("❌ Prototype decorator returned the same instance");
    }

    if (instanceA.instanceId !== 1 || instanceB.instanceId !== 2) {
        throw new Error("❌ Prototype instances did not increment as expected");
    }

    console.log("✅ Each instantiation produced a new object");
};

const testPrototypeHasNoContextEntry = () => {
    console.log("\n📋 Test 2: Prototype instances are not cached in application context");

    DummyPrototype.resetCount();
    new DummyPrototype();

    const contextInstance = getApplicationContext(DummyPrototype);
    if (contextInstance !== undefined) {
        throw new Error("❌ Prototype component should not be resolvable from the context");
    }

    console.log("✅ getApplicationContext() returns undefined for prototype components");
};

const testPrototypeExtendsBaseComponents = () => {
    console.log("\n📋 Test 3: Prototype instance still inherits Component helpers");

    const instance = new DummyPrototype() as DummyPrototype & Component;

    if (!(instance instanceof Component)) {
        throw new Error("❌ Prototype instance was not recognized as Component");
    }

    if (!(instance instanceof PrototypeComponent)) {
        throw new Error("❌ Prototype instance was not recognized as PrototypeComponent");
    }

    if (instance.getScope() !== Scope.PROTOTYPE) {
        throw new Error(`❌ Expected scope PROTOTYPE but found ${instance.getScope()}`);
    }

    // Calling stop() should be a no-op without throwing
    instance.stop();
    console.log("✅ Prototype instance exposes Component helpers");
};

(async function main() {
    try {
        console.log("🚀 Starting Prototype Scope Integration Tests\n");
        console.log("=".repeat(50));

        testPrototypeCreatesFreshInstances();
        testPrototypeHasNoContextEntry();
        testPrototypeExtendsBaseComponents();

        console.log("\n" + "=".repeat(50));
        console.log("🎉 Prototype scope integration tests passed");
    } catch (err) {
        console.error("\n" + "=".repeat(50));
        console.error("❌ Prototype scope integration tests failed:", err);
        process.exit(1);
    }
})();
