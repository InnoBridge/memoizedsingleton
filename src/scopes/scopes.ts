import { getApplicationContext, setApplicationContext } from '@/application-context/application_context';
import { 
    Component, 
    SingletonComponent,
    RequestComponent,
    Scope
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
function Singleton<T, C extends new(...a:any[]) => T>(Target: C): C {
  // Create a new class that extends SingletonComponent
  const Decorated = class extends SingletonComponent {
    constructor(...args: any[]) {
      // Check for existing singleton instance first
      const existing = getApplicationContext(Decorated as any);
      if (existing) {
        return existing as any;
      }

      // Call SingletonComponent constructor with args (this sets scope = 'SINGLETON')
      super(...args);

      // Now we need to initialize the Target's instance properties
      // Create a temporary instance to get its properties
      const tempInstance = Reflect.construct(Target, args, Decorated);
      
      // Copy all own properties from the temp instance to this
      Object.keys(tempInstance as object).forEach(key => {
        (this as any)[key] = (tempInstance as any)[key];
      });

      // Store the singleton instance
      setApplicationContext(this as unknown as Component, Decorated as any);
    }
  };

  // Copy all prototype methods from Target to Decorated
  // This ensures methods defined in Target are available
  Object.getOwnPropertyNames(Target.prototype).forEach(name => {
    if (name === 'constructor') return;
    const descriptor = Object.getOwnPropertyDescriptor(Target.prototype, name);
    if (descriptor) {
      Object.defineProperty(Decorated.prototype, name, descriptor);
    }
  });

  // Copy static properties from Target (like static instanceCount)
  Object.getOwnPropertyNames(Target).forEach(name => {
    if (['prototype', 'name', 'length'].includes(name)) return;
    const descriptor = Object.getOwnPropertyDescriptor(Target, name);
    if (descriptor) {
      Object.defineProperty(Decorated, name, descriptor);
    }
  });

  return Decorated as any as C;
};


function Request<T, C extends new(...a:any[]) => T>(Target: C): C {
  // Create a new class that extends RequestComponent
  const Decorated = class extends RequestComponent {
    constructor(...args: any[]) {
      // Check for existing instance in current request scope
      const existing = getApplicationContext(Decorated as any);
      if (existing) {
        return existing as any;
      }

      // Call RequestComponent constructor (sets scope = 'REQUEST')
      super(...args);
    
      // Now we need to initialize the Target's instance properties
      // Create a temporary instance to get its properties
      const tempInstance = Reflect.construct(Target, args, Decorated);

      // Copy all own properties from the temp instance to this
      Object.keys(tempInstance as object).forEach(key => {
        (this as any)[key] = (tempInstance as any)[key];
      });

      // Store the request-scoped instance
      setApplicationContext(this as unknown as Component, Decorated as any);
    }
  };

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