import { clearApplicationContext, setApplicationContext } from '@/application-context/application_context';

enum Scope {
  SINGLETON = 'SINGLETON',
  TRANSIENT = 'TRANSIENT',
  REQUEST = 'REQUEST'
};

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
    this.setScope(Scope.SINGLETON);
  }

  getScope(): Scope | undefined {
    return Scope.SINGLETON;
  }
};

class RequestComponent extends Component {
  constructor(args?: any) {
    super();
    this.setScope(Scope.REQUEST);
  }

  getScope(): Scope | undefined {
    return Scope.REQUEST;
  }
};

export {
    Component,
    SingletonComponent,
    RequestComponent,
    Scope
};