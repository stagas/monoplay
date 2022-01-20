import { SyntaxDefinition } from 'code-syntax'
import { join, modify } from './util'

const ids = /[a-zA-Z_$][a-zA-Z0-9_$]*/
const num = /inf|nan|\d[\d_]*(\.((e[+-]?)?[\d]+)+[kBb]*|(e[+-]?[\d]+)?[kBb]*)/
const ops =
  /\+\+|--|\+=|-=|\*=|\/=|%=|<<=|>>=|&=|\^=|\|=|&&|!&|\|\||!=|==|>=|<=|>>|<<|\.\.|[{}\\"'`,\-~+*/%=<>?!:;.|&^@]{1}/

export default {
  // declare: [
  //   join(
  //     '',
  //     modify(
  //       '+', //
  //       join(
  //         '|', //
  //         ids,
  //         num,
  //         ops,
  //         /[[\](),.=\s+]/
  //       )
  //     ),
  //     /\)\s+=/
  //   ),
  //   {
  //     // arguments: [
  //     //   /(?<=\().*?(?=\))/,
  //     //   {
  //     //     declare: num,
  //     //     string: /[[\]]/,
  //     //     arguments: /\w+/,
  //     //     operator: ops,
  //     //   },
  //     // ],
  //     arrow: /=$/,
  //     declare: ids,
  //     operator: ops,
  //     punctuation: /[[\]()]/,
  //   },
  // ],
  property: join('', ids, /(?=\()/),
  normal: ids,
  declare: /t|pi2?/,
  number: num,
  punctuation: /[[\](),]/,
  operator: ops,
} as SyntaxDefinition
