import { getApplicationContext, setApplicationContext } from '@/application-context/application_context';
import { 
    Component, 
    SingletonComponent,
    RequestComponent
} from '@/building-blocks/component';

/**
 * Singleton decorator
 * -------------------
 * Makes the target class extend {@link SingletonComponent} so that only one instance
 * exists application-wide. You can optionally associate the singleton with a qualifier,
 * allowing multiple logical singletons per constructor.
 *
 * ```ts
 * @Singleton // uses the default qualifier
 * class DummySingleton {}
 *
 * @Singleton('secondary') // explicit qualifier
 * class QualifiedSingleton {}
 *
 * const defaultInstance = new DummySingleton();
 * const secondInstance = new QualifiedSingleton();
 * // defaultInstance === new DummySingleton(); // true (same default qualifier)
 * // secondInstance === new QualifiedSingleton(); // true (same 'secondary' qualifier)
 * ```
 *
 * The qualifier argument is optional. `@Singleton` stores the instance under the default qualifier,
 * while `@Singleton('name')` isolates instances per qualifier string.
 *
 * Note: TypeScript's decorator typing limitations mean the return type still appears as the
 * original class. Cast to `DummySingleton & Component` if you need compile-time awareness of the
 * {@link Component} mixin APIs.
 */
function Singleton<T, C extends new(...a:any[]) => T>(qualifierOrTarget?: string | C): any {
  const decorate = (Target: C, qualifier?: string): C => {
  // Create a new class that extends SingletonComponent
  const Decorated = class extends SingletonComponent {
    constructor(...args: any[]) {
      // Check for existing singleton instance with optional qualifier
      const existing = getApplicationContext(Decorated as any, qualifier);
      if (existing) {
        return existing as any;
      }

      // Call SingletonComponent constructor with args (this sets scope = 'SINGLETON')
      super(...args);

      // Apply Target's constructor to initialize properties on this instance
      const instance = Reflect.construct(Target, args, new.target);
      Object.assign(this, instance);

      // Store the singleton instance along with qualifier information
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

  // Direct usage: @Singleton
  if (typeof qualifierOrTarget === 'function') {
    return decorate(qualifierOrTarget as C);
  }

  // Factory usage: @Singleton() or @Singleton('qualifier')
  const qualifier = qualifierOrTarget;
  return (Target: C): C => decorate(Target, qualifier);
}

/**
 * Request decorator
 * -----------------
 * Extends the target class with {@link RequestComponent}, providing a single instance per
 * request scope (using AsyncLocalStorage under the hood). Like {@link Singleton}, you can
 * optionally supply a qualifier so multiple logical instances of the same constructor are
 * isolated within a single request.
 *
 * ```ts
 * @Request
 * class DummyRequest {
 *   constructor(public id?: string) {}
 * }
 *
 * @Request('admin')
 * class AdminRequestContext {}
 *
 * @Request('guest')
 * class GuestRequestContext {}
 *
 * initializeRequestContext(() => {
 *   const defaultContext = new DummyRequest('default');
 *   const adminContext = new AdminRequestContext('admin-1');
 *   const guestContext = new GuestRequestContext('guest-1');
 *
 *   console.log(defaultContext === new DummyRequest('default')); // true
 *   console.log(adminContext === new AdminRequestContext('admin-2')); // true
 *   console.log(guestContext === new GuestRequestContext('guest-2')); // true
 *   console.log(adminContext === guestContext); // false
 * });
 * ```
 *
 * Qualifiers behave the same way as with singletons, but the lifetime is bound to the active
 * request context. Remember to call `initializeRequestContext` before using request-scoped components.
 *
 * TypeScript does not automatically reflect the {@link Component} methods on decorated classes;
 * cast to `DummyRequest & Component` when you need compile-time access to the helper APIs.
 */
function Request<T, C extends new(...a:any[]) => T>(qualifierOrTarget?: string | C): any {
  const decorate = (Target: C, qualifier?: string): C => {
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

        // Store the request-scoped instance with qualifier information
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
  };

  // Direct usage: @Request
  if (typeof qualifierOrTarget === 'function') {
    return decorate(qualifierOrTarget as C);
  }

  // Factory usage: @Request() or @Request('qualifier')
  const qualifier = qualifierOrTarget;
  return (Target: C): C => decorate(Target, qualifier);
}


export {
    Singleton,
    Request
};