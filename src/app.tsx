import './style.css'
import 'plenty-themes/blue-matrix.css'
import 'construct-style-sheets-polyfill'
import 'scoped-registries'

import { CodeEditElement, HTMLCodeEditElement, languages } from 'code-edit'
import { HTMLIconSvgElement, IconSvgElement } from 'icon-svg'
import { css } from 'nested-css'
// import { useCollection } from './helpers'
import { Provider } from 'virtual-state'
import type { Collection, Value } from 'virtual-state'
import { HTMLKnobElement, KnobElement } from 'x-knob'
import { Plot } from 'x-plot'
import { Fragment, h, render, setCurrentProvider } from '@stagas/vele'
import { Sound, SoundState } from './components'

customElements.define('x-plot', Plot)
customElements.define('x-knob', KnobElement)
customElements.define('code-edit', CodeEditElement)
customElements.define('icon-svg', IconSvgElement)

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'code-edit': HTMLCodeEditElement & HTMLAttributes<CodeEditElement>
      'icon-svg': HTMLIconSvgElement & HTMLAttributes<IconSvgElement>
      'x-knob': Partial<HTMLKnobElement> & HTMLAttributes<KnobElement>
    }

    interface IntrinsicAttributes {
      theme?: string
    }
  }
}

const customStyle = document.createElement('style')
document.body.appendChild(customStyle)

languages.mono = import('./mono-syntax')

const style = css`
  html,
  body {
    width: 100%;
    height: 100%;
    padding: 0;
    margin: 0;
    background: #2a2f2a;
    color: #f4f4f4;
  }
  main {
    display: flex;
    width: 100%;
    height: 100%;
  }
  code-edit {
    margin: 0;
    padding: 0;
  }

  .sounds {
    display: flex;
    width: 100%;
    height: 100%;
    flex-flow: column nowrap;
    row-gap: 0.5em;
    align-items: center;
    justify-content: flex-start;
  }
  * {
    --color: var(--foreground);
    --selection: #15d;

    --normal: var(--white);
    --comment: var(--brightBlack);
    --string: var(--brightYellow);
    --function: var(--green);
    --punctuation: var(--brightBlue);
    --number: var(--blue);
    --property: var(--yellow);
    --property-weight: bold;
    --arguments: var(--yellow);
    --operator: var(--brightRed);
    --builtin: var(--number);
    --keyword: var(--brightRed);
    --declare: var(--cyan);
    --arrow: var(--cyan);
    --value: var(--cyan);
    --special: var(--yellow);
    --regexp: var(--brightPurple);
    --tag: var(--brightRed);
    --attribute: var(--green);

    --declare-style: italic;
    --arrow-style: italic;
    --arguments-style: italic;
  }
`

const provider = new Provider()

setCurrentProvider(provider as never)

export const useValue = provider.useValue
export const useState = provider.useState
export const useRef = provider.useRef
export const useEffect = provider.useEffect
export const useCollection = provider.useCollection

export type { Value, Collection }

const App = () => {
  console.log('draw app')

  const sounds = useCollection(id => {
    const sound = new SoundState(id)
    // sound.compile()
    return sound
  })

  const allSounds = ['a', 'b', 'c']

  return (
    <>
      <style>{style('')}</style>
      <div class="sounds">
        {allSounds.map(x => (
          <Sound key={x} sound={sounds.get(x)} />
        ))}
      </div>
    </>
  )
}

render(<App />, document.querySelector('main')!)
