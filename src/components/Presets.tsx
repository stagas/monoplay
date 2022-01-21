import { CodeEditElement } from 'code-edit'
import { css } from 'nested-css'
import { Fragment, h } from '@stagas/vele'
import { Value, useEffect, useRef } from '../app'

const unicode = (a: number, b: number) => String.fromCharCode(a + Math.random() * (b - a + 1))

const style = css`
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
`

export const Presets = ({
  soundRef,
  editorRef,
}: {
  soundRef: Value<HTMLDivElement>
  editorRef: Value<CodeEditElement>
}) => {
  const presetRef = useRef<HTMLDivElement>()

  useEffect(() => {
    const el = presetRef.current
    const resize = () => {
      el.style.height = '0'
      const rect = soundRef.current.getBoundingClientRect()
      el.style.height = rect.height + 'px'
    }
    setTimeout(resize)
    const observer = new ResizeObserver(resize)
    observer.observe(editorRef.current!)
  }, [presetRef])

  return (
    <>
      <style>{style('.presets')}</style>
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
    </>
  )
}
