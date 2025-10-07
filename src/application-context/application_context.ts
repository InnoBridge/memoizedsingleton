type Constructor<T = any> = new (...args: any[]) => T;

const contextContainer = new Map<Constructor, object>();

const setApplicationContext = (instance: object, constructorRef?: Constructor): void => {
    const className = constructorRef || (instance.constructor as Constructor);
    contextContainer.set(className, instance);
};

const getApplicationContext = <T>(className: Constructor<T>): T | undefined => {
    return contextContainer.get(className) as T | undefined;
};

export {
    setApplicationContext,
    getApplicationContext
};