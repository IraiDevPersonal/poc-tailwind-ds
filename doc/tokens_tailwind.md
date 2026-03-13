# Tokens primitivos y semánticos en Tailwind CSS v4

## Pregunta

Estoy tratando de entender algunas cosas, los diseñadores me están proporcionando tokens primitivos y tokens semánticos. ¿Cómo debería llevar esto correctamente a Tailwind?

Por ejemplo, me están proporcionando un token semántico con el siguiente nombre:

```css
--radius-button: var(--rounded-full);
```

Donde el token primitivo `--rounded-full` tiene un valor de `624.9375rem`.

Y para poner un poco más de contexto, un token semántico para el color:

```css
--bg-primary-default: var(--claro-400);
```

Donde `--claro-400` es `#FD766C`.

---

## Respuesta

### La diferencia conceptual

```
Token primitivo   →  el valor crudo
Token semántico   →  el significado / uso
```

```css
--claro-400: #fd766c /* primitivo (¿qué es?) */
  --bg-primary-default: var(--claro-400) /* semántico (¿para qué sirve?) */;
```

El semántico **nunca tiene un valor directo**, siempre apunta a un primitivo. Esto permite que el tema cambie (dark mode, white label, etc.) sin tocar los componentes.

---

### El problema con Tailwind

Tailwind genera utilidades a partir de variables en `@theme`. Si pones variables semánticas ahí directamente, las utilidades generadas tendrían nombres raros como `bg-bg-primary-default`, lo cual no tiene sentido.

La solución es **separar las responsabilidades**:

```
Primitivos  →  @theme              (generan utilidades)
Semánticos  →  :root o @layer base (son referencias, no utilidades)
```

---

### Cómo estructurarlo correctamente

```css
@import "tailwindcss";

/* ─────────────────────────────────────────
   1. TOKENS PRIMITIVOS → dentro de @theme
   Generan las utilidades de Tailwind
───────────────────────────────────────── */
@theme {
  /* Colores primitivos */
  --color-claro-400: #fd766c;
  --color-claro-300: #fe9089;
  --color-claro-500: #fc5a50;

  /* Radios primitivos */
  --radius-full: 624.9375rem;
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
}

/* ─────────────────────────────────────────
   2. TOKENS SEMÁNTICOS → fuera de @theme
   Son alias, no generan utilidades propias
───────────────────────────────────────── */
@layer base {
  :root {
    --bg-primary-default: var(--color-claro-400);
    --radius-button: var(--radius-full);
  }
}
```

---

### Cómo usarlos en componentes

Los tokens semánticos los usas con **valores arbitrarios** de Tailwind:

```html
<!-- Con token semántico (recomendado en componentes) -->
<button class="bg-(--bg-primary-default) rounded-(--radius-button)">
  Botón
</button>

<!-- Con token primitivo (también válido) -->
<button class="bg-claro-400 rounded-full">Botón</button>
```

---

### El enfoque más limpio: conectar semánticos con @theme inline

Si quieres que los semánticos **también generen utilidades** con nombres útiles, puedes mapearlos en `@theme` usando la opción `inline`:

```css
/* ✗ Sin inline → puede resolver mal el valor en cascada CSS */
@theme {
  --color-primary: var(--bg-primary-default);
}

/* ✓ Con inline → resuelve el valor correctamente */
@theme inline {
  --color-primary: var(--bg-primary-default);
  --radius-button: var(--radius-full);
}

/* Ahora puedes usar: bg-primary  y  rounded-button */
```

> ⚠️ Sin `inline`, Tailwind genera la utilidad como `var(--color-primary)` y la resolución puede fallar si el valor se define en un scope diferente del DOM. Con `inline`, el valor se incrusta directamente en la clase generada.

---

### La arquitectura completa recomendada

```css
@import "tailwindcss";

/* CAPA 1 — Primitivos puros */
@theme {
  --color-claro-300: #fe9089;
  --color-claro-400: #fd766c;
  --color-claro-500: #fc5a50;
  --color-oscuro-900: #1a1a2e;

  --radius-full: 624.9375rem;
  --radius-md: 0.5rem;
}

/* CAPA 2 — Semánticos (alias, sin utilidades) */
@layer base {
  :root {
    /* Color */
    --bg-primary-default: var(--color-claro-400);
    --bg-primary-hover: var(--color-claro-300);
    --text-on-primary: var(--color-oscuro-900);

    /* Radio */
    --radius-button: var(--radius-full);
    --radius-card: var(--radius-md);
  }
}

/* CAPA 3 — Componentes que consumen semánticos */
@layer components {
  .btn-primary {
    background-color: var(--bg-primary-default);
    border-radius: var(--radius-button);
    color: var(--text-on-primary);
  }
}
```

---

### La ventaja real de esta separación

Cuando el diseñador cambie el tema (por ejemplo dark mode o una marca diferente), **solo cambias la Capa 2**:

```css
/* Tema oscuro — solo redefines los semánticos */
@layer base {
  [data-theme="dark"] {
    --bg-primary-default: var(--color-claro-300);
    --text-on-primary: var(--color-claro-400);
  }
}
```

Los componentes no se tocan. Los primitivos no se tocan. Solo cambias qué primitivo apunta cada semántico. Esa es exactamente la intención detrás del sistema que te están entregando los diseñadores.

---

### Resumen de capas

| Capa            | Directiva           | Contenido                                    | Genera utilidades                      |
| --------------- | ------------------- | -------------------------------------------- | -------------------------------------- |
| 1 - Primitivos  | `@theme`            | Valores crudos (`#FD766C`, `624.9375rem`...) | Sí (`bg-claro-400`, `rounded-full`...) |
| 2 - Semánticos  | `@layer base :root` | Alias que apuntan a primitivos               | No                                     |
| 3 - Componentes | `@layer components` | Clases que consumen semánticos               | Sí (clases propias)                    |
