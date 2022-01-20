import { atomic } from 'atomic'
import { CodeEditElement } from 'code-edit'
import { css } from 'nested-css'
import { KnobElement } from 'x-knob'
import { Plot } from 'x-plot'
import { Arg, Token } from '@stagas/mono'
import { Fragment, VRef, h } from '@stagas/vele'
import { make } from '../compile'
import { Collection, HookState, useCollection, useRef, useState } from '../helpers'
import { Edit } from '.'

const unicode = (a: number, b: number) => String.fromCharCode(a + Math.random() * (b - a + 1))

const style = css`
  display: flex;
  /* max-width: 100%; */
  background: var(--black);
  flex-flow: row nowrap;

  /* width: 50ch; */

  .main {
    /* min-width: 400px; */
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

  .knobs {
    font-family: Kanit;
    display: flex;
    flex-flow: row nowrap;
    justify-content: space-around;

    x-knob {
      &::part(knob-container) {
        margin-top: -10px;
        width: 50px;
        height: 80px;
      }
      &::part(knob-outer) {
        width: 100%;
        height: 100%;
      }
      input {
        display: none;
      }
    }
  }

  .presets {
    display: block;
    min-width: 100px;
    max-width: 100px;
    margin: 0;
    padding: 0;
    .inner {
      min-height: 100.5%;
    }
    overflow-y: scroll;
    overscroll-behavior: contain;
    span {
      display: inline-flex;
      vertical-align: bottom;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.5);
      &:hover {
        background: rgba(0, 0, 0, 0);
      }
      width: 50px;
      height: 51px;
      text-overflow: clip;
      color: var(--black);
    }
    button {
      position: relative;
      cursor: pointer;
      display: block;
      float: left;
      opacity: 0.5;
      color: var(--black);
      &:hover {
        opacity: 1;
      }
      font-family: Cambria, Cochin, Georgia, Times, 'Times New Roman', serif;
      font-size: 20px;
      height: 50px;
      /* line-height: 0.5em; */
      width: 50px;
      margin: 0;
      padding: 0;
      border: none;
      /* overflow: hidden; */
    }
  }

  button {
    width: 42px;
    border: none;
    background: #9991;
    color: var(--purple);
  }

  code-edit::part(textarea) {
    min-height: 7em;
  }
  code-edit::part(parent) {
    resize: vertical;
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
  value: HookState<number>
  min: number
  max: number
}
export class SoundState {
  id: string
  memory?: WebAssembly.Memory
  vars?: Arg[]
  sym?: Token
  fill?: (...args: number[]) => number
  floats = useState(new Float32Array([0]))
  value = useState(
    // 'f(x[40..300]=100)=\n  sin(x)' //pi2*(x+exp(-t%0.25*y)*p/(t%0.25)))\n *exp(-t%0.25*z)'
    'f(x[40..300]=100,y[1..100],z[1..100],p[0.001..5])=\n  sin(pi2*(x+exp(-t%0.25*y)*p/(t%0.25)))\n* exp(-t%0.25*z)'
  )
  knobs = useState(
    useCollection((id: string, arg?: Arg, prev?: KnobState): KnobState => {
      let min = 0
      let max = 1
      if (arg!.range) {
        const [[, _min], [, _max]] = arg!.range
        min = parseFloat(_min as string)
        max = parseFloat(_max as string)
      }
      const value = prev ? prev.value : useState(1)
      if (arg!.default) {
        if (prev) {
          if (value.value != parseFloat(arg!.default[1] as never))
            value.set(parseFloat(arg!.default[1] as never))
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
  const plot: VRef<Plot> = {}
  const editor: VRef<CodeEditElement> = {}
  const ref = useRef<HTMLDivElement>(() => sound.compile())
  const presetRef = useRef<HTMLDivElement>((el: HTMLDivElement) => {
    const resize = () => {
      el.style.height = '0'
      const rect = ref.current!.getBoundingClientRect()
      el.style.height = rect.height + 'px'
    }
    setTimeout(resize)
    const observer = new ResizeObserver(resize)
    observer.observe(editor.current!)
  })
  console.log('draw all')
  return (
    <div ref={ref} class="sound" theme="blue-matrix">
      <style>{style('.sound')}</style>
      <div class="main">
        <div class="edit">
          <Edit
            ref={editor}
            style="width:50ch;"
            value={sound.value}
            language="mono"
            theme="blue-matrix"
            onkeydown={ev => {
              if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) {
                ev.preventDefault()
                sound.compile()
                return false
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
      <div ref={presetRef} class="presets">
        <div class="inner">
          {Array.from({ length: 20 })
            .fill(0)
            .map((_, i) => (
              <button
                key={i}
                style={{
                  background: `var(--${
                    ['yellow', 'green', 'red', 'blue', 'cyan', 'purple'][(Math.random() * 6) | 0]
                  })`,
                }}
              >
                {unicode(0x0250, 0x02af)}
              </button>
            ))}
        </div>
      </div>
    </div>
  )
}

const Knobs = ({ knobs }: { knobs: HookState<Collection<KnobState, Arg>> }) => {
  console.log('draw knobs')
  return (
    <>
      {knobs.get().map((knob, key) => {
        const ref = useRef<KnobElement>(el =>
          setTimeout(() => el.dispatchEvent(new InputEvent('input')))
        )
        return (
          <x-knob ref={ref} key={key} theme="sweet" fontsize={21} fontspace={0} fontpos={18}>
            <input
              ref={ref}
              type="range"
              step={(knob.max - knob.min) / 127}
              min={knob.min}
              max={knob.max}
              value={Math.min(knob.max, Math.max(knob.min, knob.value.value))}
              oninput={ev => {
                knob.value.set(+ev.currentTarget.value)
              }}
            />
          </x-knob>
        )
      })}
    </>
  )
}

const SoundPlot = ({ plot, sound }: { plot: VRef<Plot>; sound: SoundState }) => {
  return <x-plot autoresize ref={plot} width="600" height="60" data={sound.floats.get()} />
}
