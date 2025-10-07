import { clearApplicationContext, setApplicationContext } from '@/application-context/application_context';

type Scope = 'SINGLETON' | 'TRANSIENT' | 'REQUEST';

type Constructor<T = any> = new (...args: any[]) => T;

class Component {
  #scope: Scope | undefined;

  protected setScope(scope: Scope) {
    this.#scope = scope;
  }

  getScope(): Scope | undefined {
    return this.#scope;
  }

  stop(): void {
    clearApplicationContext(this.constructor as Constructor);
  }

  replace<T extends Component>(this: T, newInstance: T): T {
    // Remove the current instance from the context
    clearApplicationContext(this.constructor as Constructor);
    
    // Add the new instance to the context
    setApplicationContext(newInstance, this.constructor as Constructor);
    
    // Return the new instance
    return newInstance;
  }
};

class SingletonComponent extends Component {
  constructor(args?: any) {
    super();
    this.setScope('SINGLETON');
  }
};

export {
    Component,
    SingletonComponent
};