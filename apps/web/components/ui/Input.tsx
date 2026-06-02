import { forwardRef, type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?:     string
  error?:     string
  leftIcon?:  React.ReactNode
  rightIcon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, leftIcon, rightIcon, className = '', id, ...rest },
  ref,
) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-medium text-xinuco-muted uppercase tracking-wider"
        >
          {label}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xinuco-muted pointer-events-none">
            {leftIcon}
          </span>
        )}

        <input
          ref={ref}
          id={id}
          className={[
            'input-base',
            leftIcon  ? 'pl-10' : '',
            rightIcon ? 'pr-10' : '',
            error     ? '!border-red-500 focus:!ring-red-500/25' : '',
            className,
          ].join(' ')}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          {...rest}
        />

        {rightIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xinuco-muted">
            {rightIcon}
          </span>
        )}
      </div>

      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-400 animate-fade-in">
          {error}
        </p>
      )}
    </div>
  )
})
