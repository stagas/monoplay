export const fill = ({ vars }: { vars: string[] }) => `;;wasm
(import "env" "memory" (memory 16 16))
;;(import "env" "memory" (memory 16 16 shared))

(global $pi (f32) (f32.const 3.1415927410125732))

(global $pi2 (f32) (f32.const 6.2831854820251465))

(global $t (mut f32) (f32.const 0))

(func $fill (export "fill") (param $input i32) (param $size i32) ${vars
  .map(x => `(param $${x} f32)`)
  .join(' ')}
  (local $i i32)

  ;; i = 0
  (local.set $i (i32.const 0))

  ;; do
  (loop $loop
    ;; f32mem[i] = f(i / sampleRate)
    (f32.store
      (i32.mul (i32.const 4) (local.get $i))
      (global.set $t
        (f32.div
          (f32.convert_i32_u (local.get $i))
          (f32.const 44100.0)
        )
      )
      (call $f
        ${vars.map(x => `(local.get $${x})`).join(' ')}
      )
    )

    ;; i++
    (local.set $i (i32.add (local.get $i) (i32.const 1)))

    ;; if (i !== 5) continue $loop
    (br_if $loop (i32.ne (local.get $i) (local.get $size)))
  )
)
`
