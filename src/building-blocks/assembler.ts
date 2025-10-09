import { getApplicationContext } from "@/application-context/application_context";

type Constructor<T = any> = new (...args: any[]) => T; 

/**
 * Property decorator that automatically injects a dependency from the application context.
 * You must specify the class type to inject.
 * 
 * @param type - The constructor/class to inject from the application context
 * @param optional - If true, returns undefined when not found instead of throwing (default: false)
 * 
 * @example
 * @Singleton
 * class Logger {
 *   log(msg: string) { console.log(msg); }
 * }
 * 
 * class MyService {
 *   @Insert(Logger)
 *   logger!: Logger;  // Required - will throw if not found
 *   
 *   @Insert(Logger, true)
 *   optionalLogger?: Logger;  // Optional - returns undefined if not found
 *   
 *   doWork() {
 *     this.logger.log('Working...');
 *     this.optionalLogger?.log('Optional works too!');
 *   }
 * }
 * 
 * // Create the singleton first
 * new Logger();
 * 
 * // Then use MyService - logger will be auto-injected
 * const service = new MyService();
 * service.doWork(); // Works! Logger is injected
 */
const Insert = <T>(type: Constructor<T>, optional: boolean = false) => {
    return function<This, Value extends T>(
        target: undefined,
        context: ClassFieldDecoratorContext<This, Value>
    ) {
        const fieldName = context.name;
        
        // Use addInitializer to eagerly resolve and inject dependency at construction time
        context.addInitializer(function(this: This) {
            // Resolve dependency immediately during construction
            const instance = getApplicationContext(type);
            
            if (!instance && !optional) {
                throw new Error(
                    `Failed to inject ${String(fieldName)}: No instance of ${type?.name || 'unknown'} found in application context. ` +
                    `Make sure the dependency is decorated with @Singleton or @Request and has been instantiated.`
                );
            }
            
            // Cache the resolved instance
            const cached = (instance as Value) || undefined;
            
            // Define property with cached value
            Object.defineProperty(this, fieldName, {
                get(): Value | undefined {
                    return cached;
                },
                enumerable: true,
                configurable: true,
            });
        });
    };
}

export { Insert };