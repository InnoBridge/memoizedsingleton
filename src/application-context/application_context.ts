import { AsyncLocalStorage } from 'async_hooks';
import { Component, Scope } from '@/building-blocks/component';

type Constructor<T = any> = new (...args: any[]) => T;

const contextSingletonContainer = new Map<Constructor, Component>();
const requestContextContainer = new AsyncLocalStorage<Map<Constructor, Component>>();

const initializeRequestContext = <T>(callback: () => T): T => {
    const requestMap = new Map<Constructor, Component>();
    return requestContextContainer.run(requestMap, callback);
};

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

const clearApplicationContext = (className: Constructor): void => {
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

const hasRequestContext = (): boolean => {
    return requestContextContainer.getStore() !== undefined;
};

export {
    initializeRequestContext,
    setApplicationContext,
    getApplicationContext,
    clearApplicationContext,
    hasRequestContext
};