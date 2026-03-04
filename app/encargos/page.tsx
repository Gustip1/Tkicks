"use client";
import { useState, useRef } from "react";

/* ─── tipos ─── */
interface Producto {
  nombre: string;
  categoria: string;
  talle: string;
  color: string;
  link: string;
  detalles: string;
  fotos: File[];
}

interface DatosPersonales {
  nombreCompleto: string;
  telefono: string;
  email: string;
  ciudad: string;
  direccion: string;
  notas: string;
}

type MetodoPago = "transferencia" | "efectivo" | "tarjeta" | "cripto" | "";

const CATEGORIAS = ["Zapatillas", "Ropa", "Accesorios", "Otro"];

const TALLES: Record<string, string[]> = {
  Zapatillas: ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45"],
  Ropa: ["XS", "S", "M", "L", "XL", "XXL"],
  Accesorios: ["Único"],
  Otro: ["Consultar"],
};

const PASOS = ["Productos", "Datos personales", "Pago"] as const;

/* ─── helpers ─── */
function productoVacio(): Producto {
  return { nombre: "", categoria: "Zapatillas", talle: "", color: "", link: "", detalles: "", fotos: [] };
}

/* ─── componente ─── */
export default function EncargosPage() {
  const [paso, setPaso] = useState(0);
  const [productos, setProductos] = useState<Producto[]>([productoVacio()]);
  const [datos, setDatos] = useState<DatosPersonales>({
    nombreCompleto: "",
    telefono: "",
    email: "",
    ciudad: "",
    direccion: "",
    notas: "",
  });
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("");
  const [errores, setErrores] = useState<string[]>([]);
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  /* ─── productos handlers ─── */
  const updateProducto = (idx: number, field: keyof Producto, value: string | File[]) => {
    setProductos((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      // al cambiar categoría, resetear talle
      if (field === "categoria") next[idx].talle = "";
      return next;
    });
  };

  const addProducto = () => setProductos((p) => [...p, productoVacio()]);

  const removeProducto = (idx: number) => {
    if (productos.length <= 1) return;
    setProductos((p) => p.filter((_, i) => i !== idx));
  };

  const handleFiles = (idx: number, files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).slice(0, 3);
    updateProducto(idx, "fotos", arr);
  };

  /* ─── validaciones ─── */
  const validarProductos = (): boolean => {
    const errs: string[] = [];
    productos.forEach((p, i) => {
      if (!p.nombre.trim()) errs.push(`Producto ${i + 1}: nombre es obligatorio`);
      if (!p.talle) errs.push(`Producto ${i + 1}: seleccioná un talle`);
    });
    setErrores(errs);
    return errs.length === 0;
  };

  const validarDatos = (): boolean => {
    const errs: string[] = [];
    if (!datos.nombreCompleto.trim()) errs.push("El nombre completo es obligatorio");
    if (!datos.telefono.trim()) errs.push("El teléfono es obligatorio");
    if (!datos.ciudad.trim()) errs.push("La ciudad es obligatoria");
    setErrores(errs);
    return errs.length === 0;
  };

  const validarPago = (): boolean => {
    const errs: string[] = [];
    if (!metodoPago) errs.push("Seleccioná un método de pago");
    setErrores(errs);
    return errs.length === 0;
  };

  /* ─── navegación ─── */
  const siguiente = () => {
    if (paso === 0 && !validarProductos()) return;
    if (paso === 1 && !validarDatos()) return;
    if (paso === 2) {
      if (!validarPago()) return;
      enviarWhatsApp();
      return;
    }
    setErrores([]);
    setPaso((p) => p + 1);
  };

  const anterior = () => {
    setErrores([]);
    setPaso((p) => Math.max(0, p - 1));
  };

  /* ─── WhatsApp ─── */
  const metodoLabel: Record<string, string> = {
    transferencia: "Transferencia bancaria",
    efectivo: "Efectivo",
    tarjeta: "Tarjeta de crédito/débito",
    cripto: "Criptomonedas",
  };

  const enviarWhatsApp = () => {
    let msg = "🛒 *NUEVO ENCARGO - TKICKS*\n\n";

    productos.forEach((p, i) => {
      msg += `━━━ Producto ${i + 1} ━━━\n`;
      msg += `• Nombre: ${p.nombre}\n`;
      msg += `• Categoría: ${p.categoria}\n`;
      msg += `• Talle: ${p.talle}\n`;
      if (p.color) msg += `• Color: ${p.color}\n`;
      if (p.link) msg += `• Link: ${p.link}\n`;
      if (p.detalles) msg += `• Detalles: ${p.detalles}\n`;
      msg += `• Fotos adjuntas: ${p.fotos.length}\n\n`;
    });

    msg += "━━━ Datos personales ━━━\n";
    msg += `• Nombre: ${datos.nombreCompleto}\n`;
    msg += `• Teléfono: ${datos.telefono}\n`;
    if (datos.email) msg += `• Email: ${datos.email}\n`;
    msg += `• Ciudad: ${datos.ciudad}\n`;
    if (datos.direccion) msg += `• Dirección: ${datos.direccion}\n`;
    if (datos.notas) msg += `• Notas: ${datos.notas}\n`;

    msg += "\n━━━ Pago ━━━\n";
    msg += `• Método: ${metodoLabel[metodoPago] || metodoPago}\n`;
    msg += `• Pago: 100% del total antes de realizar el pedido\n`;

    const url = `https://api.whatsapp.com/send?phone=5492644802994&text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  /* ─── inputs reutilizables ─── */
  const inputCls =
    "w-full rounded-lg border border-neutral-700 bg-neutral-800/60 px-4 py-3 text-sm text-white placeholder-neutral-500 focus:border-blue-500 focus:outline-none transition";
  const selectCls =
    "w-full rounded-lg border border-neutral-700 bg-neutral-800/60 px-4 py-3 text-sm text-white focus:border-blue-500 focus:outline-none transition appearance-none";
  const labelCls = "block text-xs font-medium text-neutral-400 mb-1.5";

  /* ─────────────── render ─────────────── */
  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-32">
      {/* header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Encargos Personalizados</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Completá los datos de tu pedido y te contactaremos por WhatsApp.
        </p>
      </div>

      {/* aviso 100 % */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-700/50 bg-amber-950/30 p-4">
        <span className="text-2xl">💰</span>
        <div>
          <p className="text-sm font-semibold text-amber-300">Importante: Pago del encargo</p>
          <p className="text-sm text-amber-200/80">
            Para realizar tu encargo, se debe abonar el{" "}
            <span className="font-bold text-amber-200">100% del precio del producto</span> antes de realizar el
            pedido.
          </p>
        </div>
      </div>

      {/* stepper tabs */}
      <div className="grid grid-cols-3 gap-2">
        {PASOS.map((label, i) => (
          <button
            key={label}
            onClick={() => {
              if (i < paso) {
                setErrores([]);
                setPaso(i);
              }
            }}
            className={`rounded-lg py-2.5 text-sm font-semibold transition ${
              i === paso
                ? "bg-blue-600 text-white"
                : i < paso
                ? "bg-neutral-700 text-white cursor-pointer hover:bg-neutral-600"
                : "bg-neutral-800 text-neutral-500 cursor-default"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* errores */}
      {errores.length > 0 && (
        <div className="rounded-lg border border-red-800 bg-red-950/40 p-3 space-y-1">
          {errores.map((e, i) => (
            <p key={i} className="text-xs text-red-400">
              ⚠ {e}
            </p>
          ))}
        </div>
      )}

      {/* ─── PASO 0: Productos ─── */}
      {paso === 0 && (
        <div className="space-y-6">
          {productos.map((prod, idx) => (
            <div key={idx} className="rounded-xl border border-neutral-800 bg-neutral-950 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Producto a encargar</h3>
                {productos.length > 1 && (
                  <button
                    onClick={() => removeProducto(idx)}
                    className="text-xs text-red-400 hover:text-red-300 transition"
                  >
                    Eliminar
                  </button>
                )}
              </div>

              {/* nombre */}
              <input
                type="text"
                placeholder="Nombre del producto*"
                value={prod.nombre}
                onChange={(e) => updateProducto(idx, "nombre", e.target.value)}
                className={inputCls}
              />

              {/* categoria + talle */}
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={prod.categoria}
                  onChange={(e) => updateProducto(idx, "categoria", e.target.value)}
                  className={selectCls}
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <select
                  value={prod.talle}
                  onChange={(e) => updateProducto(idx, "talle", e.target.value)}
                  className={selectCls}
                >
                  <option value="">Seleccionar talle*</option>
                  {(TALLES[prod.categoria] || []).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* color */}
              <input
                type="text"
                placeholder="Color (opcional)"
                value={prod.color}
                onChange={(e) => updateProducto(idx, "color", e.target.value)}
                className={inputCls}
              />

              {/* link */}
              <input
                type="url"
                placeholder="Link (opcional)"
                value={prod.link}
                onChange={(e) => updateProducto(idx, "link", e.target.value)}
                className={inputCls}
              />

              {/* detalles */}
              <textarea
                placeholder="Detalles adicionales (opcional)"
                rows={3}
                value={prod.detalles}
                onChange={(e) => updateProducto(idx, "detalles", e.target.value)}
                className={inputCls}
              />

              {/* fotos */}
              <div>
                <p className="text-xs text-neutral-400 mb-2">Fotos del producto (máximo 3)</p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileRefs.current[idx]?.click()}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition"
                  >
                    Seleccionar archivos
                  </button>
                  <span className="text-xs text-neutral-500">
                    {prod.fotos.length > 0
                      ? prod.fotos.map((f) => f.name).join(", ")
                      : "ningún archivo seleccionado"}
                  </span>
                  <input
                    ref={(el) => { fileRefs.current[idx] = el; }}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFiles(idx, e.target.files)}
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={addProducto}
            className="w-full rounded-lg border border-dashed border-neutral-700 py-3 text-sm font-medium text-neutral-400 hover:border-neutral-500 hover:text-white transition"
          >
            + Agregar otro producto
          </button>
        </div>
      )}

      {/* ─── PASO 1: Datos personales ─── */}
      {paso === 1 && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white">Datos personales</h3>

          <div>
            <label className={labelCls}>Nombre completo *</label>
            <input
              type="text"
              placeholder="Tu nombre y apellido"
              value={datos.nombreCompleto}
              onChange={(e) => setDatos({ ...datos, nombreCompleto: e.target.value })}
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Teléfono *</label>
              <input
                type="tel"
                placeholder="+54 9 264..."
                value={datos.telefono}
                onChange={(e) => setDatos({ ...datos, telefono: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Email (opcional)</label>
              <input
                type="email"
                placeholder="tu@email.com"
                value={datos.email}
                onChange={(e) => setDatos({ ...datos, email: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Ciudad *</label>
              <input
                type="text"
                placeholder="San Juan, CABA, etc."
                value={datos.ciudad}
                onChange={(e) => setDatos({ ...datos, ciudad: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Dirección (opcional)</label>
              <input
                type="text"
                placeholder="Calle y número"
                value={datos.direccion}
                onChange={(e) => setDatos({ ...datos, direccion: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Notas adicionales (opcional)</label>
            <textarea
              rows={3}
              placeholder="Algo que quieras aclarar..."
              value={datos.notas}
              onChange={(e) => setDatos({ ...datos, notas: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>
      )}

      {/* ─── PASO 2: Pago ─── */}
      {paso === 2 && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-5 space-y-5">
          <h3 className="text-sm font-bold text-white">Método de pago</h3>
          <p className="text-xs text-neutral-400">
            Seleccioná cómo preferís abonar el 100% del encargo.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { value: "transferencia", label: "Transferencia", icon: "🏦", desc: "CBU / Alias" },
                { value: "efectivo", label: "Efectivo", icon: "💵", desc: "Pago en mano" },
                { value: "tarjeta", label: "Tarjeta", icon: "💳", desc: "Crédito / Débito" },
                { value: "cripto", label: "Cripto", icon: "₿", desc: "USDT, BTC, etc." },
              ] as const
            ).map((m) => (
              <button
                key={m.value}
                onClick={() => setMetodoPago(m.value)}
                className={`flex flex-col items-center gap-1 rounded-xl border-2 p-4 transition ${
                  metodoPago === m.value
                    ? "border-blue-500 bg-blue-950/40"
                    : "border-neutral-700 bg-neutral-900 hover:border-neutral-500"
                }`}
              >
                <span className="text-2xl">{m.icon}</span>
                <span className="text-sm font-semibold text-white">{m.label}</span>
                <span className="text-[11px] text-neutral-400">{m.desc}</span>
              </button>
            ))}
          </div>

          {/* resumen */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 space-y-2">
            <h4 className="text-xs font-semibold text-neutral-300">Resumen del encargo</h4>
            {productos.map((p, i) => (
              <div key={i} className="flex justify-between text-xs text-neutral-400">
                <span>
                  {p.nombre || `Producto ${i + 1}`} — {p.categoria} — Talle {p.talle || "?"}
                </span>
              </div>
            ))}
            <div className="border-t border-neutral-800 pt-2 text-xs text-neutral-400">
              <span>Envío a: {datos.ciudad || "—"}</span>
            </div>
            {metodoPago && (
              <div className="text-xs text-blue-400">
                Pago: {metodoLabel[metodoPago]}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Navegación ─── */}
      <div className="flex gap-3">
        {paso > 0 && (
          <button
            onClick={anterior}
            className="flex-1 rounded-xl border border-neutral-700 py-3.5 text-sm font-semibold text-white hover:bg-neutral-800 transition"
          >
            Anterior
          </button>
        )}
        <button
          onClick={siguiente}
          className="flex-1 rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white hover:bg-blue-700 transition"
        >
          {paso === 2 ? "Enviar pedido por WhatsApp" : "Siguiente"}
        </button>
      </div>
    </div>
  );
}


