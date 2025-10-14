import { Config, getConfig } from "@/components/config";
import { getApplicationContext } from "@/application-context/application_context";
import { Component } from "@/building-blocks/component";
import { clearDotEnvCache } from "@/utils/env";

const REQUIRED_KEY = 'CONFIG_TEST_REQUIRED';
const OPTIONAL_KEY = 'CONFIG_TEST_OPTIONAL';

const resetConfigState = () => {
	const existing = getApplicationContext(Config) as (Config & Component) | undefined;
	existing?.stop();

	delete process.env[REQUIRED_KEY];
	delete process.env[OPTIONAL_KEY];

	clearDotEnvCache();
};

const testSingletonInstanceReuse = () => {
	console.log('\n📋 Test 1: Config behaves as a singleton');
	resetConfigState();

	process.env[REQUIRED_KEY] = 'alpha-value';

	const instance1 = new Config([REQUIRED_KEY]);
	const instance2 = new Config([REQUIRED_KEY]);

	if (instance1 !== instance2) {
		throw new Error('❌ Config returned different instances for the same singleton');
	}

	const contextInstance = getApplicationContext(Config);
	if (contextInstance !== instance1) {
		throw new Error('❌ Config instance in application context does not match constructed instance');
	}

	console.log('✅ Multiple constructions reuse the same Config instance and store it in context');
	resetConfigState();
};

const testGetConfigReturnsValue = () => {
	console.log('📋 Test 2: getConfig returns stored configuration values');
	resetConfigState();

	process.env[REQUIRED_KEY] = 'beta-value';
	new Config([REQUIRED_KEY]);

	const value = getConfig(REQUIRED_KEY);
	if (value !== 'beta-value') {
		throw new Error(`❌ Expected getConfig to return "beta-value" but received "${value}"`);
	}

	console.log('✅ getConfig retrieves the configuration value from the singleton');
	resetConfigState();
};

const testDefaultValueFallback = () => {
	console.log('📋 Test 3: Default values are used when environment variables are missing');
	resetConfigState();

	const fallback = 'fallback-value';
	const config = new Config([{ key: OPTIONAL_KEY, defaultValue: fallback }]);

	const stored = config.get(OPTIONAL_KEY);
	if (stored !== fallback) {
		throw new Error(`❌ Expected Config to store the default value "${fallback}" but received "${stored}"`);
	}

	const retrieved = getConfig(OPTIONAL_KEY);
	if (retrieved !== fallback) {
		throw new Error(`❌ Expected getConfig to return the default value "${fallback}" but received "${retrieved}"`);
	}

	console.log('✅ Config falls back to provided default values when env vars are absent');
	resetConfigState();
};

const testMissingRequiredKeyThrows = () => {
	console.log('📋 Test 4: Missing required configuration keys throw errors');
	resetConfigState();

	let threw = false;
	try {
		new Config([REQUIRED_KEY]);
	} catch (error) {
		threw = true;
		console.log(`✅ Missing configuration threw as expected: ${(error as Error).message}`);
	}

	if (!threw) {
		throw new Error('❌ Expected Config to throw when a required key was absent');
	}

	resetConfigState();
};

const testGetConfigThrowsWhenUninitialized = () => {
	console.log('📋 Test 5: getConfig throws when Config has not been initialized');
	resetConfigState();

	let threw = false;
	try {
		getConfig(REQUIRED_KEY);
	} catch (error) {
		threw = true;
		console.log(`✅ getConfig threw as expected without initialization: ${(error as Error).message}`);
	}

	if (!threw) {
		throw new Error('❌ Expected getConfig to throw when Config was not initialized');
	}

	resetConfigState();
};

(async function main() {
	try {
		console.log('🚀 Starting Config Integration Tests');
		console.log('='.repeat(50));

		testSingletonInstanceReuse();
		testGetConfigReturnsValue();
		testDefaultValueFallback();
		testMissingRequiredKeyThrows();
		testGetConfigThrowsWhenUninitialized();

		console.log('\n' + '='.repeat(50));
		console.log('🎉 All Config integration tests passed!');
	} catch (err) {
		console.error('\n' + '='.repeat(50));
		console.error('❌ Config integration tests failed:', err);
		process.exit(1);
	} finally {
		resetConfigState();
	}
})();
