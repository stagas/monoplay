import { css } from 'nested-css'
import { KnobElement } from 'x-knob'
import { Arg } from '@stagas/mono'
import { Fragment, h } from '@stagas/vele'
import { Collection, Value, useEffect, useRef } from '../app'

const style = css`
  font-family: Kanit;
  display: flex;
  flex-flow: row;
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
`

export interface KnobState {
  id: string
  arg: Arg
  value: Value<number>
  min: number
  max: number
}

const Knob = ({ knob }: { knob: KnobState }) => {
  const inputRef = useRef<HTMLInputElement>()
  const knobRef = useRef<KnobElement>()

  useEffect(() => {
    setTimeout(() => {
      if (knobRef.current!.value !== knob.value.value) {
        inputRef.current!.dispatchEvent(new InputEvent('input'))
      }
    })
  }, [inputRef, knobRef, knob.value])

  return (
    <x-knob ref={knobRef} theme="sweet" fontsize={21} fontspace={0} fontpos={18}>
      <input
        ref={inputRef}
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
}

export const Knobs = ({
  knobs,
  vars,
}: {
  knobs: Value<Collection<KnobState, Arg>>
  vars: Value<Arg[]>
}) => {
  console.log('draw knobs')
  return (
    <>
      <style>{style('.knobs')}</style>
      {vars.get().map(arg => (
        <Knob key={'' + arg.id} knob={knobs.get().get('' + arg.id)} />
      ))}
    </>
  )
}
