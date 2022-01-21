import { atomic } from 'atomic'
import { CodeEditElement } from 'code-edit'
import { css } from 'nested-css'
import { KnobElement } from 'x-knob'
import { Plot } from 'x-plot'
import { Arg, Token } from '@stagas/mono'
import { Fragment, VRef, h } from '@stagas/vele'
import { Collection, Value, useCollection, useEffect, useRef, useState, useValue } from '../app'
import { make } from '../compile'
import { Edit, Knobs, Presets } from '.'

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

  button {
    width: 42px;
    border: none;
    background: #9991;
    color: var(--purple);
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

interface KnobState {
  id: string
  arg: Arg
  value: Value<number>
  min: number
  max: number
}
export class SoundState {
  id: string
  memory?: WebAssembly.Memory
  vars?: Arg[]
  sym?: Token
  fill?: (...args: number[]) => number
  floats = useValue(new Float32Array([0]))
  value = useValue(
    // 'f(x[40..300]=100)=\n  sin(x)' //pi2*(x+exp(-t%0.25*y)*p/(t%0.25)))\n *exp(-t%0.25*z)'
    'f(x[40..300]=100,y[1..100],z[1..100],p[0.001..5])=\n  sin(pi2*(x+exp(-t%0.25*y)*p/(t%0.25)))\n* exp(-t%0.25*z)'
  )
  knobs = useValue(
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
  constructor(id: string) {
    this.id = id
  }
  async compile() {
    const { fill, vars, memory, sym } = (await make(this.value.value, this.memory as never))!
    this.fill = fill
    this.vars = vars
    this.memory = memory
    this.sym = sym
    const knobs = this.knobs.value
    for (const arg of this.vars!) {
      const knob = knobs.upget('' + arg.id, arg)
      knob.arg = arg
    }
    this.knobs.set(knobs)
    this.run()
  }
  run() {
    const floats = new Float32Array(this.memory!.buffer, 0, 44100)
    const knobs = this.knobs.value

    try {
      const args = this.vars!.filter(x => knobs.has('' + x.id)).map(x => {
        return knobs.get('' + x.id, x)!.value.value
      })

      this.fill!(0, 44100, ...args)

      this.floats.set(floats)
    } catch (e) {
      console.error(e)
    }
  }
  play() {
    const floats = new Float32Array(this.memory!.buffer, 0, 44100)
    const buffer = ctx.createBuffer(1, size, ctx.sampleRate)
    buffer.copyToChannel(floats, 0)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.start()
  }
  patch = atomic(
    signal =>
      async function (this: SoundState) {
        // TODO: atomic()
        // if (rendering) return
        // rendering = true

        return new Promise<void>(resolve => {
          const knobs = this.knobs.value
          let input = this.value.value
          const fnargs = knobs.map((x, _, i) => {
            const arg = x.arg!
            return (
              (i > 0 ? '\n  ' : '') +
              arg.id +
              (arg.range ? `[${arg.range[0][1]}..${arg.range[1][1]}]` : '') +
              '=' +
              parseFloat(x.value.value.toFixed(Math.abs(+x.value.value) < 10 ? 2 : 1))
            )
          })

          const [, after] = split(input, this.sym!.index)
          const [fndef] = split(after, after.indexOf(')'))
          const [, args] = split(fndef, fndef.indexOf('(') + 1)
          const newArgs = fnargs.join(',')
          input = insert(input, input.indexOf(args), newArgs, args.length)

          const prev = document.activeElement! as CodeEditElement
          prev.blur()

          let prevSelect = prev.pins?.textarea?.selectionStart
          this.value.set(input)

          if (prevSelect) {
            prevSelect += newArgs.length - args.length
            setTimeout(() => {
              if (signal.aborted) return

              prev.pins?.textarea?.setSelectionRange(prevSelect, prevSelect)
              prev.focus()
              resolve()
              // rendering = false
            })
          } else {
            resolve()
            // rendering = false
          }
        })
      }
  )
}

const split = (x: string, index: number): [string, string] => [x.slice(0, index), x.slice(index)]
const insert = (x: string, index: number, y: string, offset = 0) => {
  return x.slice(0, index) + y + x.slice(index + offset)
}

let frame: number
export const Sound = ({ sound }: { sound: SoundState }) => {
  const plot = useRef<Plot>()
  const editorRef = useRef<CodeEditElement>()

  const soundRef = useRef<HTMLDivElement>()
  useEffect(() => {
    sound.compile()
  }, [soundRef])

  console.log('draw sound')

  return (
    <div ref={soundRef} class="sound" theme="blue-matrix">
      <style>{style('.sound')}</style>
      <div class="main">
        <div class="edit">
          <Edit
            ref={editorRef}
            value={sound.value}
            language="mono"
            theme="blue-matrix"
            onkeydown={ev => {
              if (ev.ctrlKey || ev.metaKey) {
                if (ev.key === 'Enter' || ev.key === 's') {
                  ev.preventDefault()
                  sound.compile()
                  return false
                }
              }
            }}
          />
          <button theme="blue-matrix" onclick={() => sound.play()}>
            <icon-svg set="feather" icon="play" />
          </button>
        </div>
        <div
          class="knobs"
          oninput={() => {
            cancelAnimationFrame(frame)
            frame = requestAnimationFrame(() => {
              sound.patch()
              sound.run()
            })
          }}
        >
          <Knobs knobs={sound.knobs} />
        </div>
        <SoundPlot plot={plot} sound={sound} />
      </div>
      <Presets soundRef={soundRef} editorRef={editorRef} />
    </div>
  )
}

const SoundPlot = ({ plot, sound }: { plot: VRef<Plot>; sound: SoundState }) => {
  return <x-plot autoresize ref={plot} width="600" height="60" data={sound.floats.get()} />
}
