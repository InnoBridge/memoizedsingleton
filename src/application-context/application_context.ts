import { Component } from '@/building-blocks/component';

type Constructor<T = any> = new (...args: any[]) => T;

const contextContainer = new Map<Constructor, Component>();

const setApplicationContext = (instance: Component, constructorRef?: Constructor): void => {
    const className = constructorRef || (instance.constructor as Constructor);
    contextContainer.set(className, instance);
};

const getApplicationContext = <T>(className: Constructor<T>): (T & Component) | undefined => {
    return contextContainer.get(className) as (T & Component) | undefined;
};

const clearApplicationContext = (className: Constructor): void => {
    contextContainer.delete(className);
};

export {
    setApplicationContext,
    getApplicationContext,
    clearApplicationContext
};