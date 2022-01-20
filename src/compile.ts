import { Module, Type, build } from '@stagas/mono'
import * as lib from './lib.wat'

export const make = async (expr: string, initialMemory?: WebAssembly.Memory) => {
  try {
    const result = await compile(expr, { memory: initialMemory })
    const vars = result.vars
    const fill = result.instance.exports.fill
    return { fill, memory: result.instance.memory, vars, sym: result.sym }
  } catch (e) {
    console.error(e)
  }
}

const wasm = async (binary: Uint8Array, memory?: WebAssembly.Memory) => {
  memory ||= new WebAssembly.Memory({
    initial: 16,
    maximum: 16,
    // shared: true,
  })
  const mod = new WebAssembly.Module(binary)
  const instance = new WebAssembly.Instance(mod, { env: { memory } })
  return { exports: instance.exports, memory }
}

export interface MakeOptions {
  metrics?: boolean
  memory?: WebAssembly.Memory
}

export const compile = async (input: string, { memory }: MakeOptions = {}) => {
  const globals = { t: Type.f32, pi: Type.f32, pi2: Type.f32 }

  const result = build(input, globals, {}, (mod: Module) => {
    const vars = mod.funcs['f'][0].map(x => x.toString()).filter(x => x != 't')
    return Object.values(lib).map(x => x({ vars }))
  })

  const ctx = result.module.contexts.get(result.module.funcs['f'])!
  const vars = ctx.args

  const instance = (await wasm(result.buffer, memory)) as {
    exports: { [k: string]: (...args: number[]) => number }
    memory: WebAssembly.Memory
  }

  return { instance, module: result.module, vars, sym: ctx.sym }
}
