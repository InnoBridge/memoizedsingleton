type Scope = 'SINGLETON' | 'TRANSIENT' | 'REQUEST';

class Component {
  #scope: Scope | undefined;

  protected setScope(scope: Scope) {
    this.#scope = scope;
  }

  getScope(): Scope | undefined {
    return this.#scope;
  }

//   start(): void {
    // startup logic
//   }

//   stop(): void {
    // cleanup logic
//   }
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