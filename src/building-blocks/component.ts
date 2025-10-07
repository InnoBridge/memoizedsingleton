import { clearApplicationContext } from '@/application-context/application_context';

type Scope = 'SINGLETON' | 'TRANSIENT' | 'REQUEST';

class Component {
  #scope: Scope | undefined;

  protected setScope(scope: Scope) {
    this.#scope = scope;
  }

  getScope(): Scope | undefined {
    return this.#scope;
  }

  stop(): void {
    clearApplicationContext(this.constructor as any);
  }

  replace(): void {
    // Default no-op
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