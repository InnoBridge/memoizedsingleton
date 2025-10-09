import { AsyncLocalStorage } from 'async_hooks';
import { Component, Scope } from '@/building-blocks/component';

type Constructor<T = any> = new (...args: any[]) => T;

const contextSingletonContainer = new Map<Constructor, Component>();
const requestContextContainer = new AsyncLocalStorage<Map<Constructor, Component>>();

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
    const requestMap = new Map<Constructor, Component>();
    return requestContextContainer.run(requestMap, callback);
};

/**
 * Stores a component instance in the application context.
 * The instance is stored in the appropriate scope (SINGLETON or REQUEST) based on its scope metadata.
 *
 * @param instance - The component instance to store
 * @param constructorRef - Optional constructor reference. If omitted, uses instance.constructor
 * @throws Error if no active request scope exists for REQUEST-scoped components
 * @throws Error if the scope is unsupported
 * 
 * @example
 * const myService = new MyService();
 * setApplicationContext(myService);
 * 
 */
const setApplicationContext = (instance: Component, constructorRef?: Constructor): void => {
    const className = constructorRef || (instance.constructor as Constructor);
    switch (instance.getScope()) {
        case Scope.SINGLETON:
            contextSingletonContainer.set(className, instance);
            break;
        case Scope.REQUEST:
            const requestMap = requestContextContainer.getStore();
            if (!requestMap) {
                throw new Error('No active request scope. Make sure to call within withRequestScope().');
            }
            requestMap.set(className, instance);
            break;
        default:
            throw new Error(`Unsupported scope: ${instance.getScope()}`);
    }
};

/**
 * Retrieves a component instance from the application context.
 * 
 * @param className - The constructor/class of the component to retrieve
 * @returns The component instance cast to the specified type with Component methods, or undefined if not found
 * @throws Error if the scope is unsupported
 * 
 * @example
 * const myService = getApplicationContext(MyService);
 * if (myService) {
 *   myService.doSomething();
 * }
 * 
 */
const getApplicationContext = <T>(className: Constructor<T>): (T & Component) | undefined => {
    switch (className.prototype.getScope()) {
        case Scope.REQUEST:
            const requestMap = requestContextContainer.getStore();
            if (!requestMap) {
                return undefined;
            }
            return requestMap.get(className) as (T & Component) | undefined;
        case Scope.SINGLETON:
            return contextSingletonContainer.get(className) as (T & Component) | undefined;
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
 * 
 * @example
 * removeComponentFromApplicationContext(MyService);
 * 
 */
const removeComponentFromApplicationContext = (className: Constructor): void => {
    switch (className.prototype.getScope()) {
        case Scope.REQUEST:
            const requestMap = requestContextContainer.getStore();
            if (!requestMap) {
                return;
            }
            requestMap.delete(className);
            break;
        case Scope.SINGLETON:
            contextSingletonContainer.delete(className);
            break;
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