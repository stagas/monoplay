const X = RegExp
export const join = (s: string | undefined, ...r: RegExp[]) =>
  X(`(${r.map(x => `(${x.source})`).join(s)})`)
export const split = (s: string) =>
  X(
    `(${s
      .split(' ')
      .map((x: string) => x.replace(/[\^$\\()[\]?*+\-.|]/g, '\\$&').trim())
      .filter((x: string | any[]) => x.length)
      .join('|')})`
  )
export const modify = (m: string, x: RegExp) => X(`(${x.source})${m}`)

export const allChildren = (els: Element[]) =>
  [...els].map(el => [el, ...(el.querySelectorAll('*') as never)]).flat(Infinity) as Element[]
export const allChildrenOf = (slot: HTMLSlotElement) => allChildren(slot.assignedElements())
