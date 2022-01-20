import { debounce } from 'debounce-micro'
import { VHook, VRef, current } from '@stagas/vele'

export interface StateValue<T> {
  get(): T
  set(value: T): void
}

export class HookState<T> implements StateValue<T> {
  value: T

  #hooks: Set<VHook> = new Set()

  constructor(initialValue: T) {
    this.value = initialValue
  }

  get() {
    const hook = current.hook
    if (hook) this.#hooks.add(hook)
    return this.value
  }

  set(newValue: T) {
    this.value = newValue
    this.trigger()
  }

  trigger = debounce(() => {
    const hooks = [...this.#hooks]
    // this.#hooks.clear()
    hooks.forEach(hook => hook.trigger())
  })
}

export const useState = <T>(value: T) => new HookState(value)

export const useLocalStorage = <T>(name: string, value: T): StateValue<T> => {
  if (localStorage[name]) value = localStorage[name]
  const state = useState(value)
  return {
    get(): T {
      return state.get()
    },
    set(newValue: T) {
      state.set((localStorage[name] = newValue))
    },
  }
}

export class AsyncContext<T> {
  hasLoaded = false
  isLoading = false
  error?: Error
  value?: T
  promise: Promise<HookState<AsyncContext<T>>>
  #resolve!: (value: HookState<AsyncContext<T>>) => void
  #reject!: (error: Error) => void

  #state: HookState<AsyncContext<T>>
  #initializer: () => Promise<T>

  constructor(initializer: () => Promise<T>) {
    this.#initializer = initializer
    this.#state = useState(this)
    this.promise = new Promise((resolve, reject) => {
      this.#resolve = resolve
      this.#reject = reject
    })
  }

  get() {
    this.load()
    return this.#state.get()
  }

  set(value: T) {
    this.value = value
    this.#state.set(this)
  }

  load() {
    if (!this.hasLoaded && !this.isLoading) {
      this.isLoading = true
      this.#initializer()
        .then(value => {
          this.hasLoaded = true
          this.isLoading = false
          this.value = value
          this.#state.set(this)
          this.#resolve(this.#state)
        })
        .catch((error: Error) => {
          this.isLoading = false
          this.error = error
          this.#reject(error)
        })
    }
  }

  refresh() {
    if (!this.isLoading) {
      this.hasLoaded = false
      this.load()
    }
  }

  async whenLoaded() {
    return (await this.get().promise).get().value!
  }
}

export const useAsyncContext = <T>(initializer: () => Promise<T>) => {
  const context = new AsyncContext(initializer)
  return (): AsyncContext<T> => context
}

export interface Collection<T, V> {
  get(id: string, initial?: V): T
  upget(id: string, newValue: V): T
  has(id: string): boolean
  map<P>(fn: (value: T, key: string, index: number, map: Map<string, T>) => P): P[]
}

export const useCollection = <T, V>(
  creator: (id: string, initial?: V, prev?: T) => T
): Collection<T, V> => {
  const map: Map<string, T> = new Map()
  return {
    get(id: string, initial?: V) {
      let item = map.get(id)
      if (item) return item

      item = creator(id, initial)
      map.set(id, item)
      return item
    },
    upget(id: string, newValue: V) {
      const item = creator(id, newValue, map.get(id))
      map.set(id, item)
      return item
    },
    has(id: string) {
      return map.has(id)
    },
    map(fn) {
      return [...map.entries()].map(([key, value], i) => fn(value, key, i, map))
    },
  }
}

export class Ref<T> implements VRef<T> {
  #current: T | null = null
  #oncreate: (el: T) => void
  constructor(oncreate: (el: T) => void) {
    this.#oncreate = oncreate
  }
  get current(): T | null {
    return this.#current
  }
  set current(el: T | null) {
    this.#current = el
    if (el) this.#oncreate(el)
  }
}

export const useRef = <T>(oncreate: (el: T) => void) => new Ref<T>(oncreate)
