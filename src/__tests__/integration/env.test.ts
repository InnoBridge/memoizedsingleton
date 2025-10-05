import { readEnv, clearDotEnvCache } from '@/../utils/env';
import assert from 'node:assert';

const readFromDotEnvTest = () => {
    console.log('Starting tests...');
    const fromEnvFile = readEnv('FROM_ENV_FILE');
    const exampleKey = readEnv('EXAMPLE_KEY');
    const anotherNumber = readEnv('ANOTHER_NUMBER');
    assert.equal(fromEnvFile, 'hello_from_file');
    console.log("FROM_ENV_FILE:", fromEnvFile);
    assert.equal(exampleKey, 'example_value');
    console.log("EXAMPLE_KEY:", exampleKey);
    assert.equal(anotherNumber, '123');
    console.log("ANOTHER_NUMBER:", anotherNumber);
    console.log('Env vars read successfully from .env file');
    clearDotEnvCache();
};

const readFromEnvTest = () => {
    console.log('Starting tests...');
    const envExample = 'example_value';
    const envNumber = '123';
    process.env['EXAMPLE_KEY'] = envExample;
    process.env['ANOTHER_NUMBER'] = envNumber;
    assert.equal(readEnv('EXAMPLE_KEY'), envExample);
    console.log("EXAMPLE_KEY:", envExample);
    assert.equal(readEnv('ANOTHER_NUMBER'), envNumber);
    console.log("ANOTHER_NUMBER:", envNumber);
    console.log('Env vars read successfully from process.env');
    delete process.env['EXAMPLE_KEY'];
    delete process.env['ANOTHER_NUMBER'];
};

(async function main() {
    try {
        // sync test
        // promise tests in order
        readFromDotEnvTest();
        readFromEnvTest();
        
        console.log("🎉 All integration tests passed");
    } catch (err) {
        console.error("❌ Integration tests failed:", err);
        process.exit(1);
    }
})();