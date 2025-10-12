# Memoized Singleton Decorators

`@innobridge/memoirizedsingleton` is a lightweight dependency injection framework that caches decorated components and injects them by retrieving the cached instance. You define a component with a decorator, instantiate it once, and every subsequent resolution fetches the cached instance automatically.

## Table of Contents

1. [Overview](#overview)
2. [Decorators](#decorators)
	 - [`@Singleton`](#singleton)
	 - [`@Request`](#request)
	 - [`@Insert`](#insert)
3. [Qualifier Model](#qualifier-model)
4. [Nested Components](#nested-components)
5. [Lifecycle APIs](#lifecycle-apis)
6. [Architecture](#architecture)
7. [Tests](#tests)

## Overview

The framework is purpose-built for modern TypeScript projects that want simple dependency wiring without metadata emit requirements. Decorators wrap a class so it automatically registers itself with the application context on first construction and reuses the stored instance on subsequent resolutions.

## Decorators

### `@Singleton`

Creates one application-wide instance per qualifier. The default qualifier (`@Singleton`) stores the instance in an in-memory map.

```ts
import { Singleton } from '@/scopes/scopes';

@Singleton // default qualifier
class DefaultCache {}

@Singleton('secondary')
class SecondaryCache {}

const cacheA = new DefaultCache();
const cacheB = new DefaultCache();
const secondary = new SecondaryCache();

console.log(cacheA === cacheB);    // true
console.log(cacheA === secondary); // false
```

### `@Request`

Creates one instance per qualifier **per asynchronous request** by storing the instance in `AsyncLocalStorage`.

```ts
import { Request } from '@/scopes/scopes';
import { initializeRequestContext } from '@/application-context/application_context';

@Request
class UserContext {
	constructor(public userId?: string) {}
}

@Request('admin')
class AdminContext {}

initializeRequestContext(() => {
	const defaultCtx = new UserContext('alice');
	const adminCtx = new AdminContext();

	console.log(defaultCtx === adminCtx); // false — different qualifiers
});
```

### `@Insert`

Field decorator that resolves dependencies from the cache when an owning class is constructed.

```ts
class Service {
	@Insert(Logger)
	logger!: Logger; // throws if missing

	@Insert(Logger, true)
	optionalLogger?: Logger; // remains undefined if Logger is absent

	@Insert(DatabaseConnection, false, 'primary')
	primaryDb!: DatabaseConnection;
}
```

Signature:

```ts
@Insert(DependencyCtor, optional?: boolean, qualifier?: string)
```

## Qualifier Model

Qualifiers map component constructors to a secondary key so multiple logical instances can coexist. The storage shape is:

```
Map<Constructor, Map<string, Component>>
```

Retrieve qualified instances explicitly with `getApplicationContext`:

```ts
import { getApplicationContext } from '@/application-context/application_context';

const defaultLogger = getApplicationContext(Logger);              // default qualifier
const secondaryLogger = getApplicationContext(Logger, 'secondary');
```

## Nested Components

Components can depend on other components through `@Insert`, regardless of scope. For example, a singleton can inject another singleton and a request scoped component can inject a qualified service.

```ts
@Singleton
class Logger {}

@Singleton('primary')
class DatabaseConnection {
	constructor(public url: string) {}
}

@Singleton
class Repository {
	@Insert(Logger)
	private logger!: Logger;

	@Insert(DatabaseConnection, false, 'primary')
	private db!: DatabaseConnection;
}

@Request
class RequestMetadata {
	@Insert(Repository)
	repo!: Repository;
}
```

The injected instances respect their own scope. A request-scoped component receives the same singleton instance as every other consumer, while maintaining isolation for other request-scoped collaborators.

## Lifecycle APIs

Every decorated instance inherits lifecycle utilities from `Component`:

| Method | Description |
| ------ | ----------- |
| `getScope()` | Returns `SINGLETON` or `REQUEST`, useful for debugging and assertions. |
| `stop()` | Removes the current instance from the cache. The next `new` call constructs and stores a replacement. |
| `replace(newInstance)` | Swaps the cached instance with `newInstance` and returns it. Handy for hot swapping in tests. |

Example:

```ts
const cache = new DefaultCache() as DefaultCache & Component;
cache.stop();                      // eviction

const altCache = cache.replace(new DefaultCache());
console.log(altCache === cache);   // false — new instance stored
```

## Architecture

### Storage Model

The framework maintains separate caches for singleton and request-scoped components using a nested map structure:

```
┌─────────────────────────────────────────┐
│   Application Context (Singleton)       │
├─────────────────────────────────────────┤
│ Map<Constructor, Map<Qualifier, Inst>>  │
│                                         │
│  Logger ──┬─→ "default" ──→ Logger#1   │
│           └─→ "audit"   ──→ Logger#2   │
│                                         │
│  Cache  ──┬─→ "default" ──→ Cache#1    │
│           └─→ "redis"   ──→ Cache#2    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│   Request Context (AsyncLocalStorage)   │
├─────────────────────────────────────────┤
│ Map<Constructor, Map<Qualifier, Inst>>  │
│                                         │
│  UserCtx ──→ "default" ──→ UserCtx#A   │
│  AdminCtx ─→ "default" ──→ AdminCtx#A  │
└─────────────────────────────────────────┘
```

### Resolution Flow

When you construct a decorated class, the decorator intercepts construction and performs cache-or-create logic:

<details>
<summary>Resolution Flow (click to expand)</summary>

```mermaid
flowchart TD
    Start([new MyClass]) --> Decorator{Decorator intercepts}
    Decorator --> CheckScope{Scope type?}
    
    CheckScope -->|Singleton| SingletonCache[(Singleton Cache<br/>Map→Map)]
    CheckScope -->|Request| RequestCache[(Request Cache<br/>AsyncLocalStorage)]
    
    SingletonCache --> LookupS{Instance exists<br/>for qualifier?}
    RequestCache --> LookupR{Instance exists<br/>for qualifier?}
    
    LookupS -->|Yes| ReturnS[Return cached instance]
    LookupS -->|No| ConstructS[Construct new instance]
    ConstructS --> StoreS[Store in singleton cache]
    StoreS --> ReturnS
    
    LookupR -->|Yes| ReturnR[Return cached instance]
    LookupR -->|No| ConstructR[Construct new instance]
    ConstructR --> StoreR[Store in request cache]
    StoreR --> ReturnR
    
    ReturnS --> End([Instance returned])
    ReturnR --> End
    
    style SingletonCache fill:#e1f5ff
    style RequestCache fill:#fff4e1
    style ConstructS fill:#d4edda
    style ConstructR fill:#d4edda
```

</details>

![Resolution Flow](assets/resolution-flow.png)

### Request Scope Lifecycle

Request-scoped components live within an async boundary created by `initializeRequestContext`:

<details>

<summary>Request Scope Lifecycle (click to expand)</summary>

```mermaid
flowchart TD
    Start([Incoming Request]) --> InitCtx[initializeRequestContext called]
    InitCtx --> CreateALS[AsyncLocalStorage creates<br/>new async context]
    CreateALS --> EmptyCache[Initialize empty request cache<br/>Map&lt;Constructor, Map&lt;Qualifier, Instance&gt;&gt;]
    
    EmptyCache --> FirstCall[new UserContext#40;'alice'#41;]
    FirstCall --> CheckFirst{Cache has<br/>UserContext:default?}
    CheckFirst -->|No| Construct1[Construct new instance]
    Construct1 --> Store1[Store in cache:<br/>UserContext:default → instance]
    Store1 --> Return1[Return instance]
    
    Return1 --> SecondCall[new UserContext#40;#41;<br/>#40;2nd call, same request#41;]
    SecondCall --> CheckSecond{Cache has<br/>UserContext:default?}
    CheckSecond -->|Yes| Return2[Return cached instance]
    
    Return2 --> Handler[Execute request handler logic]
    Handler --> Complete[Request complete]
    Complete --> ExitALS[Exit async context]
    ExitALS --> ClearCache[Clear request cache]
    ClearCache --> End([Ready for next request])
    
    style EmptyCache fill:#fff4e1
    style Construct1 fill:#d4edda
    style Return2 fill:#d1ecf1
    style ClearCache fill:#f8d7da
```

</details>

![Request Flow](assets/request-flow.png)


### Dependency Injection Flow

`@Insert` resolves dependencies eagerly during class construction:

<details>

<summary>Dependency Injection Flow (click to expand)</summary>

```mermaid
flowchart LR
    A[Service constructed] --> B[@Insert decorator runs]
    B --> C{Check optional flag}
    
    C -->|Required| D[Get from cache]
    C -->|Optional| E[Try get from cache]
    
    D --> F{Found?}
    F -->|Yes| G[Inject instance]
    F -->|No| H[Throw error]
    
    E --> I{Found?}
    I -->|Yes| G
    I -->|No| J[Set undefined]
    
    G --> K[Property assigned]
    J --> K
    H --> L[Construction fails]
    
    style H fill:#f8d7da
    style G fill:#d4edda
    style J fill:#fff3cd
```

</details>

![Lifecycle Flow](assets/lifecycle-flow.png)


# Tests
```
npm run test:integration --file=env.test.ts
npm run test:integration --file=expressrequestscope.test.ts
npm run test:integration --file=insert.test.ts
npm run test:integration --file=requestscope.test.ts
npm run test:integration --file=singletonscope.test.ts
```