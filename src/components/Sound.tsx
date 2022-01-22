import { atomic } from 'atomic'
import { CodeEditElement } from 'code-edit'
import { css } from 'nested-css'
import { Arg, Token } from '@stagas/mono'
import { h } from '@stagas/vele'
import { Value, useCallback, useCollection, useEffect, useRef, useState, useValue } from '../app'
import { make } from '../compile'
import { Edit, KnobState, Knobs, PresetState, Presets } from '.'

const style = css`
  display: flex;
  background: var(--black);
  flex-flow: row nowrap;
  width: 100%;

  .main {
    width: 100%;
    display: flex;
    flex-flow: column nowrap;
  }

  .edit {
    padding: 0.5em;
    display: flex;
    flex-flow: row nowrap;
    column-gap: 0.5em;
    z-index: 1;
  }

  .play {
    cursor: pointer;
    width: 42px;
    border: none;
    background: #9991;
    color: var(--purple);
    &:hover {
      background: #9992;
    }
  }

  code-edit {
    &::part(textarea) {
      min-height: 7em;
    }
    &::part(parent) {
      resize: vertical;
    }
  }

  x-plot {
    width: 100%;
    height: 40px;
  }
`

const size = 44100
const sampleRate = 44100

const ctx = new AudioContext({ sampleRate, latencyHint: 'playback' })

const split = (x: string, index: number): [string, string] => [x.slice(0, index), x.slice(index)]
const insert = (x: string, index: number, y: string, offset = 0) => {
  return x.slice(0, index) + y + x.slice(index + offset)
}

const unicode = (a: number, b: number) => String.fromCharCode(a + Math.random() * (b - a + 1))

let frame: number
export const Sound = (_props: { sound: string }) => {
  const editorRef = useRef<CodeEditElement>()
  const soundRef = useRef<HTMLDivElement>()

  // sound data
  const memory = useState<WebAssembly.Memory | null>(null)
  const vars = useState<Arg[]>([])
  const sym = useState<Token | null | void>(null)
  const floats = useState(new Float32Array([0]))
  const knobValues = useState<number[] | null>(null)

  const presets = useState<PresetState[]>(() => {
    return Array.from({ length: 20 })
      .fill(0)
      .map((_, i) => ({
        id: i,
        name: unicode(0x0250, 0x02af),
        color: ['yellow', 'green', 'red', 'blue', 'cyan', 'purple'][(Math.random() * 6) | 0],
      }))
  })

  const code = useState(
    'f(x[40..300]=100,y[1..100],z[1..100],p[0.001..5])=\n  sin(pi2*(x+exp(-t%0.25*y)*p/(t%0.25)))\n* exp(-t%0.25*z)'
  )

  const knobs = useState(
    useCollection((id: string, arg?: Arg, prev?: KnobState): KnobState => {
      let min = 0
      let max = 1
      if (arg!.range) {
        const [[, _min], [, _max]] = arg!.range
        min = parseFloat(_min as string)
        max = parseFloat(_max as string)
      }
      const defaultValue = arg!.default ? parseFloat(arg!.default[1] as never) : 1
      const value = prev ? prev.value : useValue(defaultValue)
      if (arg!.default) {
        if (prev) {
          if (value.value != defaultValue) {
            value.set(defaultValue)
          }
        }
      }
      return {
        id,
        arg: arg!,
        value,
        min,
        max,
      }
    })
  )

  const fill = useState<((start: number, end: number, ...args: number[]) => number) | null>(null)

  const play = useCallback(() => {
    const buffer = ctx.createBuffer(1, size, ctx.sampleRate)
    buffer.copyToChannel(floats.value, 0)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.start()
  })

  const compile = useCallback(async () => {
    console.log('compile')
    const res = await make(code.value, memory.value)
    if (!res) return

    memory.set(res.memory)
    vars.set(res.vars)
    sym.set(res.sym)
    fill.set(() => res.fill as never)
    queueMicrotask(run)
  })

  useEffect(() => {
    const k = knobs.value
    for (const arg of vars.value!) {
      const knob = k.upget('' + arg.id, arg)
      knob.arg = arg
    }
    knobs.set(k)
  }, [vars])

  useEffect(() => {
    const k = knobs.value
    knobValues.set(
      vars.value.filter(x => k.has('' + x.id)).map(x => k.get('' + x.id, x)!.value.value)
    )
  }, [knobs, vars, code])

  const run = useCallback(() => {
    try {
      fill.value!(0, 44100, ...knobValues.value!)
      floats.set(new Float32Array(memory.value!.buffer, 0, 44100))
    } catch (e) {
      console.error(e)
    }
  })

  const patch = useCallback(
    atomic(
      signal => async () =>
        new Promise<void>(resolve => {
          let input = code.value

          const total = vars.value.length
          const fnargs = vars.value.map((arg, i) => {
            const value = knobs.value.get('' + arg.id).value.value
            return (
              (i > 0 ? (total > 4 ? (i % 2 ? '\t' : '\n  ') : '\n  ') : '') +
              arg.id +
              (arg.range ? `[${arg.range[0][1]}..${arg.range[1][1]}]` : '') +
              '=' +
              parseFloat(value.toFixed(Math.abs(+value) < 10 ? 2 : 1))
            )
          })

          const [, after] = split(input, sym.value!.index)
          const [fndef] = split(after, after.indexOf(')'))
          const [, args] = split(fndef, fndef.indexOf('(') + 1)
          const newArgs = fnargs.join(',')
          input = insert(input, input.indexOf(args), newArgs, args.length)

          const prev = document.activeElement! as CodeEditElement
          prev.blur()

          let prevSelect = prev.pins?.textarea?.selectionStart
          code.set(input)

          if (prevSelect) {
            prevSelect += newArgs.length - args.length
            setTimeout(() => {
              if (signal.aborted) return

              prev.pins?.textarea?.setSelectionRange(prevSelect, prevSelect)
              prev.focus()

              resolve()
            })
          } else {
            resolve()
          }
        })
    )
  )

  useEffect(() => {
    compile()
  }, [soundRef])

  console.log('draw sound')

  return (
    <div ref={soundRef} class="sound" theme="blue-matrix">
      <style>{style('.sound')}</style>
      <div class="main">
        <div class="edit">
          <Edit
            ref={editorRef}
            value={code}
            language="mono"
            theme="blue-matrix"
            onkeydown={ev => {
              if (ev.ctrlKey || ev.metaKey) {
                if (ev.key === 'Enter' || ev.key === 's') {
                  ev.preventDefault()
                  compile()
                  return false
                }
              }
            }}
          />
          <button class="play" theme="blue-matrix" onclick={() => play()}>
            <icon-svg set="feather" icon="play" />
          </button>
        </div>
        <div
          class="knobs"
          oninput={() => {
            cancelAnimationFrame(frame)
            frame = requestAnimationFrame(() => {
              patch()
              run()
            })
          }}
        >
          <Knobs knobs={knobs} vars={vars} />
        </div>
        <SoundPlot floats={floats} />
      </div>
      <Presets presets={presets} soundRef={soundRef} editorRef={editorRef} />
    </div>
  )
}

const SoundPlot = ({ floats }: { floats: Value<Float32Array> }) => {
  return <x-plot autoresize width={600} height={60} data={floats.get() as unknown as number[]} />
}
