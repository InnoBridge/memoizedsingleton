import { Singleton } from "@/scopes/scopes";
import { readEnv } from "@/utils/env";
import { getApplicationContext } from "@/application-context/application_context";

type ConfigOption = {
    key: string;
    defaultValue?: string;
};

@Singleton
class Config {

    private configurations: Map<string, string>;

    constructor(keys: Array<string | ConfigOption> = []) {
        this.configurations = new Map<string, string>();
        for (const keyOption of keys) {
            let key: string;
            let value: string | undefined;

            if (typeof keyOption === 'string') {
                key = keyOption;
                value = readEnv(key);
            } else {
                key = keyOption.key;
                try {
                    value = readEnv(key);
                } catch (error) {
                    if (keyOption.defaultValue === undefined) {
                        throw error;
                    }
                    value = keyOption.defaultValue;
                }

                if (value === undefined) {
                    value = keyOption.defaultValue;
                }
            }

            if (value === undefined) {
                throw new Error(`Configuration key "${key}" is not set and has no default value.`);
            }

            this.configurations.set(key, value);
        }
    }

    public get(key: string): string | undefined {
        return this.configurations.get(key);
    }
};

const getConfig = (key: string): string | undefined => {
    const config = getApplicationContext(Config);
    if (!config) {
        throw new Error("Config instance not found in application context");
    }
    return config.get(key);
};

export {
    Config,
    getConfig
};