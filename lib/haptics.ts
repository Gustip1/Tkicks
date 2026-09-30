/**
 * Un toque corto de vibración en momentos que importan (agregar al carrito).
 * Se dispara en el mismo instante que la animación para que se sientan como
 * una sola cosa. Android lo soporta; en iPhone Safari no existe y no pasa nada.
 */
export function haptic(ms = 10) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* sin vibración disponible */
  }
}
