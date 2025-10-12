import { getApplicationContext, setApplicationContext } from '@/application-context/application_context';
import { 
    Component, 
    SingletonComponent,
    RequestComponent
} from '@/building-blocks/component';

/**
 * Singleton decorator - makes the target class extend SingletonComponent
 * and ensures only one instance exists. The SingletonComponent constructor
 * will be called, setting scope = 'SINGLETON'.
 * 
 * Note: Due to TypeScript limitations, the decorator cannot change the type
 * of the class at compile time. The instance will have Component methods at runtime,
 * but TypeScript won't know about them unless you use a type assertion:
 * 
 * @example
 * @Singleton
 * class MyService {
 *   constructor() {
 *     console.log('MyService created');
 *   }
 * }
 * 
 * // Type assertion needed to access Component methods:
 * const instance = new MyService() as MyService & Component;
 * instance.getScope(); // Now TypeScript knows about this
 */
function Singleton<T, C extends new(...a:any[]) => T>(qualifierOrTarget?: string | C): any {
  // Check if this is direct usage (@Singleton) or factory usage (@Singleton() / @Singleton('name'))
  if (typeof qualifierOrTarget === 'function') {
    // Direct usage: @Singleton
    const Target = qualifierOrTarget as C;
    return createSingletonClass(Target, undefined);
  }
  
  // Factory usage: @Singleton() or @Singleton('qualifier')
  const qualifier = qualifierOrTarget;
  return function(Target: C): C {
    return createSingletonClass(Target, qualifier);
  };
}

function createSingletonClass<T, C extends new(...a:any[]) => T>(Target: C, qualifier?: string): C {
  // Create a new class that extends SingletonComponent
  const Decorated = class extends SingletonComponent {
    constructor(...args: any[]) {
      // Check for existing singleton instance first
      const existing = getApplicationContext(Decorated as any, qualifier);
      if (existing) {
        return existing as any;
      }

      // Call SingletonComponent constructor with args (this sets scope = 'SINGLETON')
      super(...args);

      // Apply Target's constructor to initialize properties on this instance
      const instance = Reflect.construct(Target, args, new.target);
      Object.assign(this, instance);

      // Store the singleton instance with qualifier
      setApplicationContext(this as unknown as Component, Decorated as any, qualifier);
    }
  };

  // Set the class name to match the original Target
  Object.defineProperty(Decorated, 'name', {
    value: Target.name,
    writable: false,
    configurable: true
  });

  // Copy all prototype methods from Target to Decorated
  Object.getOwnPropertyNames(Target.prototype).forEach(name => {
    if (name === 'constructor') return;
    const descriptor = Object.getOwnPropertyDescriptor(Target.prototype, name);
    if (descriptor) {
      Object.defineProperty(Decorated.prototype, name, descriptor);
    }
  });

  // Copy static properties from Target
  Object.getOwnPropertyNames(Target).forEach(name => {
    if (['prototype', 'name', 'length'].includes(name)) return;
    const descriptor = Object.getOwnPropertyDescriptor(Target, name);
    if (descriptor) {
      Object.defineProperty(Decorated, name, descriptor);
    }
  });

  return Decorated as any as C;
}

/**
 * Request decorator - makes the target class extend RequestComponent
 * and ensures one instance exists per request scope. The RequestComponent constructor
 * will be called, setting scope = 'REQUEST'.
 * 
 * Request-scoped instances are isolated per HTTP request (or other async context)
 * and are reused within the same request but not shared across different requests.
 * 
 * **Important:** You must initialize a request context using `initializeRequestContext`
 * before creating instances of REQUEST-scoped classes. In Express apps, this is typically
 * done in middleware that wraps request handlers.
 * 
 * Note: Due to TypeScript limitations, the decorator cannot change the type
 * of the class at compile time. The instance will have Component methods at runtime,
 * but TypeScript won't know about them unless you use a type assertion.
 * 
 * @example
 * import express from 'express';
 * import { initializeRequestContext, getApplicationContext } from '@/application-context/application_context';
 * 
 * // Define a request-scoped component
 * @Request
 * class UserContext {
 *   constructor(public userId?: string) {}
 *   
 *   getUserId() {
 *     return this.userId;
 *   }
 * }
 * 
 * const app = express();
 * 
 * // Middleware to initialize request context
 * app.use((req, res, next) => {
 *   initializeRequestContext(() => {
 *     // Create request-scoped instance
 *     const userId = req.headers['x-user-id'] as string;
 *     new UserContext(userId);
 *     next();
 *   });
 * });
 * 
 * // Route handler - reuses the same UserContext instance
 * app.get('/user', (req, res) => {
 *   const userContext = getApplicationContext(UserContext);
 *   res.json({ userId: userContext?.getUserId() });
 * });
 * 
 * // In Express middleware - initialize request context first
 * app.use((req, res, next) => {
 *   initializeRequestContext(() => {
 *     const userContext = new UserContext('user-123');
 *     next();
 *   });
 * });
 * 
 * // Type assertion needed to access Component methods:
 * const instance = new UserContext('user-123') as UserContext & Component;
 * instance.getScope(); // Returns 'REQUEST'
 */
function Request<T, C extends new(...a:any[]) => T>(qualifierOrTarget?: string | C): any {
  // Check if this is direct usage (@Request) or factory usage (@Request() / @Request('name'))
  if (typeof qualifierOrTarget === 'function') {
    // Direct usage: @Request
    const Target = qualifierOrTarget as C;
    return createRequestClass(Target, undefined);
  }
  
  // Factory usage: @Request() or @Request('qualifier')
  const qualifier = qualifierOrTarget;
  return function(Target: C): C {
    return createRequestClass(Target, qualifier);
  };
}

function createRequestClass<T, C extends new(...a:any[]) => T>(Target: C, qualifier?: string): C {
  // Create a new class that extends RequestComponent
  const Decorated = class extends RequestComponent {
    constructor(...args: any[]) {
      // Check for existing instance in current request scope
      const existing = getApplicationContext(Decorated as any, qualifier);
      if (existing) {
        return existing as any;
      }

      // Call RequestComponent constructor (sets scope = 'REQUEST')
      super(...args);
    
      // Apply Target's constructor to initialize properties on this instance
      const instance = Reflect.construct(Target, args, new.target);
      Object.assign(this, instance);

      // Store the request-scoped instance with qualifier
      setApplicationContext(this as unknown as Component, Decorated as any, qualifier);
    }
  };

  // Set the class name to match the original Target
  Object.defineProperty(Decorated, 'name', {
    value: Target.name,
    writable: false,
    configurable: true
  });

  // Copy all prototype methods from Target to Decorated
  Object.getOwnPropertyNames(Target.prototype).forEach(name => {
    if (name === 'constructor') return;
    const descriptor = Object.getOwnPropertyDescriptor(Target.prototype, name);
    if (descriptor) {
      Object.defineProperty(Decorated.prototype, name, descriptor);
    }
  });

  // Copy static properties from Target
  Object.getOwnPropertyNames(Target).forEach(name => {
    if (['prototype', 'name', 'length'].includes(name)) return;
    const descriptor = Object.getOwnPropertyDescriptor(Target, name);
    if (descriptor) {
      Object.defineProperty(Decorated, name, descriptor);
    }
  });

  return Decorated as any as C;
}


export {
    Singleton,
    Request
};