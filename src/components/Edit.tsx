// import { CodeEditElement } from 'code-edit'
import { VRef, h } from '@stagas/vele'
import { HookState } from '.'

export interface EditProps {
  ref?: VRef
  value: HookState<string>
  language?: string
  slot?: string
  style?: string
  theme?: string
  onkeydown?: (ev: KeyboardEvent) => void
}

export const Edit = ({ ref, value, theme, language, slot, style, onkeydown }: EditProps) => {
  return (
    <code-edit
      ref={ref}
      slot={slot}
      style={'width:100%;height:100%;' + style}
      language={language}
      theme={theme}
      value={value.get()}
      oninput={ev => value.set(ev.currentTarget.value)}
      onkeydown={onkeydown}
    ></code-edit>
  )
}
