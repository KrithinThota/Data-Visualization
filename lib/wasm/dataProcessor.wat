;; WebAssembly module for high-performance data processing
(module
  (import "env" "memory" (memory 1))
  (import "env" "log" (func $log (param i32)))

  ;; Global variables for SIMD operations
  (global $simd_enabled (mut i32) (i32.const 0))

  ;; Exported function for data aggregation
  (func (export "aggregateData") (param $inputPtr i32) (param $inputLen i32) (param $outputPtr i32) (param $bucketSize i32)
    (local $i i32)
    (local $bucket i32)
    (local $sum f64)
    (local $count i32)
    (local $min f64)
    (local $max f64)
    (local $timestamp i64)
    (local $value f64)

    ;; Initialize locals
    (local.set $i (i32.const 0))
    (local.set $min (f64.const 1e308))
    (local.set $max (f64.const -1e308))

    ;; Check if SIMD is available and use it for aggregation
    (if (global.get $simd_enabled)
      (then
        ;; SIMD-accelerated aggregation
        (call $aggregateDataSIMD (local.get $inputPtr) (local.get $inputLen) (local.get $outputPtr) (local.get $bucketSize))
        (return)
      )
    )

    ;; Fallback to scalar aggregation
    (loop $loop
      (if (i32.lt_u (local.get $i) (local.get $inputLen))
        (then
          ;; Load timestamp (i64) and value (f64) from memory
          ;; DataPoint structure: timestamp(i64), value(f64), category(i32), metadata_ptr(i32)
          (local.set $timestamp (i64.load (i32.add (local.get $inputPtr) (i32.mul (local.get $i) (i32.const 24)))))
          (local.set $value (f64.load (i32.add (local.get $inputPtr) (i32.add (i32.mul (local.get $i) (i32.const 24)) (i32.const 8)))))

          ;; Calculate bucket
          (local.set $bucket (i32.div_u (i32.wrap_i64 (local.get $timestamp)) (local.get $bucketSize)))

          ;; Update min/max
          (local.set $min (f64.min (local.get $min) (local.get $value)))
          (local.set $max (f64.max (local.get $max) (local.get $value)))

          ;; Update sum and count
          (local.set $sum (f64.add (local.get $sum) (local.get $value)))
          (local.set $count (i32.add (local.get $count) (i32.const 1)))

          (local.set $i (i32.add (local.get $i) (i32.const 1)))
          (br $loop)
        )
      )
    )

    ;; Store results back to output
    ;; Output structure: min(f64), max(f64), avg(f64), count(i32)
    (f64.store (local.get $outputPtr) (local.get $min))
    (f64.store (i32.add (local.get $outputPtr) (i32.const 8)) (local.get $max))
    (f64.store (i32.add (local.get $outputPtr) (i32.const 16))
      (f64.div (local.get $sum) (f64.convert_i32_u (local.get $count)))
    )
    (i32.store (i32.add (local.get $outputPtr) (i32.const 24)) (local.get $count))
  )

  ;; SIMD-accelerated filtering function (simplified for compatibility)
  (func (export "filterDataSIMD") (param $inputPtr i32) (param $inputLen i32) (param $threshold f64) (param $outputPtr i32) (result i32)
    (local $i i32)
    (local $filteredCount i32)
    (local $value f64)

    ;; Initialize
    (local.set $i (i32.const 0))
    (local.set $filteredCount (i32.const 0))

    ;; Process data sequentially (SIMD version would use v128 but not all tools support it)
    (loop $filter_loop
      (if (i32.lt_u (local.get $i) (local.get $inputLen))
        (then
          ;; Load value from memory
          (local.set $value (f64.load (i32.add (local.get $inputPtr)
            (i32.add (i32.mul (local.get $i) (i32.const 24)) (i32.const 8)))))

          ;; Check if value passes threshold
          (if (f64.gt (local.get $value) (local.get $threshold))
            (then
              ;; Store value if it passes filter
              (f64.store (i32.add (local.get $outputPtr) (i32.mul (local.get $filteredCount) (i32.const 8)))
                (local.get $value))
              (local.set $filteredCount (i32.add (local.get $filteredCount) (i32.const 1)))
            )
          )

          (local.set $i (i32.add (local.get $i) (i32.const 1)))
          (br $filter_loop)
        )
      )
    )

    ;; Return count of filtered elements
    (local.get $filteredCount)
  )

  ;; SIMD-accelerated aggregation helper (simplified)
  (func $aggregateDataSIMD (param $inputPtr i32) (param $inputLen i32) (param $outputPtr i32) (param $bucketSize i32)
    (local $i i32)
    (local $sum f64)
    (local $count i32)
    (local $min f64)
    (local $max f64)
    (local $value f64)

    ;; Initialize accumulators (simplified to scalar for compatibility)
    (local.set $i (i32.const 0))
    (local.set $min (f64.const 1e308))
    (local.set $max (f64.const -1e308))
    (local.set $sum (f64.const 0))
    (local.set $count (i32.const 0))

    (loop $simd_agg_loop
      (if (i32.lt_u (local.get $i) (local.get $inputLen))
        (then
          ;; Load value
          (local.set $value (f64.load (i32.add (local.get $inputPtr)
            (i32.add (i32.mul (local.get $i) (i32.const 24)) (i32.const 8)))))

          ;; Update min/max
          (local.set $min (f64.min (local.get $min) (local.get $value)))
          (local.set $max (f64.max (local.get $max) (local.get $value)))

          ;; Accumulate sum
          (local.set $sum (f64.add (local.get $sum) (local.get $value)))

          (local.set $count (i32.add (local.get $count) (i32.const 1)))
          (local.set $i (i32.add (local.get $i) (i32.const 1)))
          (br $simd_agg_loop)
        )
      )
    )

    ;; Store results
    (f64.store (local.get $outputPtr) (local.get $min))
    (f64.store (i32.add (local.get $outputPtr) (i32.const 8)) (local.get $max))
    (f64.store (i32.add (local.get $outputPtr) (i32.const 16))
      (f64.div (local.get $sum) (f64.convert_i32_u (local.get $count)))
    )
    (i32.store (i32.add (local.get $outputPtr) (i32.const 24)) (local.get $count))
  )

  ;; Initialize SIMD support
  (func (export "initSIMD") (param $enabled i32)
    (global.set $simd_enabled (local.get $enabled))
  )

  ;; Memory management functions
  (func (export "malloc") (param $size i32) (result i32)
    ;; Simple bump allocator - in real implementation, use a proper allocator
    (i32.const 1024) ;; Return a fixed offset for demo
  )

  (func (export "free") (param $ptr i32)
    ;; Free memory - placeholder for proper implementation
    (call $log (i32.const 0))
  )
)