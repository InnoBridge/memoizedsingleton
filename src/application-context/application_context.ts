import { AsyncLocalStorage } from 'async_hooks';
import { Component, Scope } from '@/building-blocks/component';

type Constructor<T = any> = new (...args: any[]) => T;

// Nested Map structure: Constructor -> (qualifier -> instance)
// This avoids string concatenation collisions and allows type-based lookups
const contextSingletonContainer = new Map<Constructor, Map<string, Component>>();
const requestContextContainer = new AsyncLocalStorage<Map<Constructor, Map<string, Component>>>();

const DEFAULT_QUALIFIER = 'default';

/**
 * Initializes a new request context and executes the provided callback within that context.
 * All request-scoped components created within the callback will be isolated to this request.
 * 
 * @param callback - The function to execute within the request context
 * @returns The return value of the callback
 * 
 * @example
 * app.use((req, res, next) => {
 *   initializeRequestContext(() => {
 *     // All request-scoped components here are isolated to this request
 *     next();
 *   });
 * });
 */
const initializeRequestContext = <T>(callback: () => T): T => {
    const requestMap = new Map<Constructor, Map<string, Component>>();
    return requestContextContainer.run(requestMap, callback);
};

/**
 * Stores a component instance in the application context.
 * The instance is stored in the appropriate scope (SINGLETON or REQUEST) based on its scope metadata.
 *
 * @param instance - The component instance to store
 * @param constructorRef - Optional constructor reference. If omitted, uses instance.constructor
 * @param qualifier - Optional qualifier to distinguish multiple instances of the same type
 * @throws Error if no active request scope exists for REQUEST-scoped components
 * @throws Error if the scope is unsupported
 * 
 * @example
 * const myService = new MyService();
 * setApplicationContext(myService);
 * 
 * // With qualifier
 * setApplicationContext(primaryDb, DatabaseConnection, 'primary');
 * 
 */
const setApplicationContext = (instance: Component, constructorRef?: Constructor, qualifier?: string): void => {
    const className = constructorRef || (instance.constructor as Constructor);
    const qual = qualifier || DEFAULT_QUALIFIER;
    console.log("Qualifier: ", qual);
    switch (instance.getScope()) {
        case Scope.SINGLETON: {
            let qualifierMap = contextSingletonContainer.get(className);
            if (!qualifierMap) {
                qualifierMap = new Map<string, Component>();
                contextSingletonContainer.set(className, qualifierMap);
            }
            qualifierMap.set(qual, instance);
            console.log('contextMap after setting singleton:', contextSingletonContainer);
            break;
        }
        case Scope.REQUEST: {
            const requestMap = requestContextContainer.getStore();
            if (!requestMap) {
                throw new Error('No active request scope. Make sure to call within withRequestScope().');
            }
            let qualifierMap = requestMap.get(className);
            if (!qualifierMap) {
                qualifierMap = new Map<string, Component>();
                requestMap.set(className, qualifierMap);
            }
            qualifierMap.set(qual, instance);
            break;
        }
        default:
            throw new Error(`Unsupported scope: ${instance.getScope()}`);
    }
};

/**
 * Retrieves a component instance from the application context.
 * 
 * @param className - The constructor/class of the component to retrieve
 * @param qualifier - Optional qualifier to retrieve a specific instance
 * @returns The component instance cast to the specified type with Component methods, or undefined if not found
 * @throws Error if the scope is unsupported
 * 
 * @example
 * const myService = getApplicationContext(MyService);
 * if (myService) {
 *   myService.doSomething();
 * }
 * 
 * // With qualifier
 * const primaryDb = getApplicationContext(DatabaseConnection, 'primary');
 * 
 */
const getApplicationContext = <T>(className: Constructor<T>, qualifier?: string): (T & Component) | undefined => {
    const qual = qualifier || DEFAULT_QUALIFIER;
    
    switch (className.prototype.getScope()) {
        case Scope.REQUEST: {
            const requestMap = requestContextContainer.getStore();
            if (!requestMap) {
                return undefined;
            }
            const qualifierMap = requestMap.get(className);
            return qualifierMap?.get(qual) as (T & Component) | undefined;
        }
        case Scope.SINGLETON: {
            const qualifierMap = contextSingletonContainer.get(className);
            return qualifierMap?.get(qual) as (T & Component) | undefined;
        }
        default:
            throw new Error(`Unsupported scope: ${className.prototype.getScope()}`);
    }
};

/**
 * Removes a specific component type from the application context.
 * 
 * **Note:** For REQUEST-scoped components, this only removes from the current request scope
 * (if one is active). Use this within `initializeRequestContext` for request-scoped components.
 * 
 * @param className - The constructor/class of the component to remove
 * @param qualifier - Optional qualifier to remove a specific instance
 * 
 * @example
 * removeComponentFromApplicationContext(MyService);
 * 
 * // With qualifier
 * removeComponentFromApplicationContext(DatabaseConnection, 'primary');
 * 
 */
const removeComponentFromApplicationContext = (className: Constructor, qualifier?: string): void => {
    const qual = qualifier || DEFAULT_QUALIFIER;
    
    switch (className.prototype.getScope()) {
        case Scope.REQUEST: {
            const requestMap = requestContextContainer.getStore();
            if (!requestMap) {
                return;
            }
            const qualifierMap = requestMap.get(className);
            qualifierMap?.delete(qual);
            // If qualifier map is now empty, remove the className key
            if (qualifierMap && qualifierMap.size === 0) {
                requestMap.delete(className);
            }
            break;
        }
        case Scope.SINGLETON: {
            const qualifierMap = contextSingletonContainer.get(className);
            qualifierMap?.delete(qual);
            // If qualifier map is now empty, remove the className key
            if (qualifierMap && qualifierMap.size === 0) {
                contextSingletonContainer.delete(className);
            }
            break;
        }
        default:
            throw new Error(`Unsupported scope: ${className.prototype.getScope()}`);
    }
};

/**
 * Clears all components from the specified scope in the application context.
 *
 * @param scope - The scope to clear (SINGLETON or REQUEST). Required.
 * @throws Error if the scope is unsupported
 * 
 * @example
 * // Clear all singletons
 * clearApplicationContext(Scope.SINGLETON);
 * 
 */
const clearApplicationContext = (scope: Scope): void => {
    switch (scope) {
        case Scope.SINGLETON:
            contextSingletonContainer.clear();
            break;
        case Scope.REQUEST:
            const requestMap = requestContextContainer.getStore();
            if (requestMap) {
                requestMap.clear();
            }
            break;
        default:
            throw new Error(`Unsupported scope: ${scope}`);
    }
};

/**
 * Checks if there is an active request context.
 * Returns true if the current execution is within a request scope initialized by initializeRequestContext.
 * 
 * @returns true if a request context is active, false otherwise
 * 
 * @example
 * if (hasRequestContext()) {
 *   // Safe to use request-scoped components
 * }
 */
const hasRequestContext = (): boolean => {
    return requestContextContainer.getStore() !== undefined;
};

export {
    initializeRequestContext,
    setApplicationContext,
    getApplicationContext,
    removeComponentFromApplicationContext,
    clearApplicationContext,
    hasRequestContext
};