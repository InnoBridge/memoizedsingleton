import { removeComponentFromApplicationContext, setApplicationContext } from '@/application-context/application_context';

enum Scope {
  SINGLETON = 'SINGLETON',
  PROTOTYPE = 'PROTOTYPE',
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

  stop(qualifier?: string): void {
    removeComponentFromApplicationContext(this.constructor as Constructor, qualifier);
  }

  replace<T extends Component>(this: T, newInstance: T, qualifier?: string): T {
    removeComponentFromApplicationContext(this.constructor as Constructor, qualifier);
    setApplicationContext(newInstance, this.constructor as Constructor, qualifier);
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

class PrototypeComponent extends Component {
  constructor(args?: any) {
    super();
    this.setScope(Scope.PROTOTYPE);
  }

  getScope(): Scope | undefined {
    return Scope.PROTOTYPE;
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
    PrototypeComponent,
    RequestComponent,
    Scope
};
