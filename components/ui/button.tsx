import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
};

/**
 * Botón del sistema Apple: la píldora es la señal de "esto es una acción".
 * - default: píldora Action Blue (el único color interactivo del sitio)
 * - outline: píldora con hairline, para la acción secundaria
 * - ghost:   texto azul sin fondo, para acciones terciarias
 * Al presionar escala a 0.95, sin sombras.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center rounded-full font-normal transition-[transform,background-color,color] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-hover focus-visible:ring-offset-2 active:scale-95 disabled:pointer-events-none disabled:opacity-40 disabled:active:scale-100';
    const variants = {
      default: 'bg-primary text-white hover:bg-primary-hover',
      outline: 'border border-gray-200 bg-white text-primary hover:bg-gray-50',
      ghost: 'text-primary hover:bg-gray-100',
    } as const;
    const sizes = {
      sm: 'h-8 px-4 text-sm',
      md: 'h-11 px-5 text-[17px]',
      lg: 'h-12 px-7 text-[17px]',
    } as const;

    return (
      <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...props} />
    );
  }
);
Button.displayName = 'Button';
