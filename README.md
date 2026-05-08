# EAN Generator · Generador local de códigos GS1

App Next.js para generar, validar y catalogar códigos EAN/GTIN cumpliendo el estándar GS1
Mod-10. Todo se guarda en local en `data/database.json` — no requiere base de datos externa.

## Características

- **Generación** EAN-13, EAN-8 e ITF-14 con cálculo automático del dígito de control.
- **Asignación secuencial** automática a partir de un prefijo de empresa configurado, o ingreso
  manual de un GTIN existente.
- **Modo oficial** (con prefijo GS1 real) o **modo interno** (rango 20–29, no apto para retail).
- **Validación** de GTINs externos: detecta tipo, valida check digit y clasifica el prefijo.
- **Catálogo** con búsqueda por GTIN, nombre, SKU, marca o categoría.
- **Descarga** del barcode como SVG o PNG, listos para imprimir.
- **Storage local** en JSON (sin native deps, instalación trivial).

## Requisitos

- Node.js 18.17 o superior (recomendado: Node 20 LTS).
- npm, pnpm o yarn.

## Instalación rápida

```bash
# 1. Entra al proyecto
cd ean-generator

# 2. Instala dependencias
npm install

# 3. Arranca en modo desarrollo
npm run dev
```

La app queda disponible en **http://localhost:3000**.

Para correr en modo producción:

```bash
npm run build
npm start
```

## Primer uso

1. Abre http://localhost:3000 — la app te llevará a **Configuración**.
2. Configura tu prefijo:
   - **Modo oficial**: si tu empresa tiene un prefijo asignado por GS1 (en Colombia, suele
     comenzar con `770` o `771`), ingrésalo completo, sin dígito de control.
   - **Modo interno**: para inventario propio o pruebas, usa cualquier prefijo que comience
     entre `20` y `29` (ej: `2000001`).
3. Ve a **Generar** y crea tu primer código.
4. Consulta el **Catálogo** para buscar y editar códigos guardados.

## Arquitectura

```
src/
  app/                    # App Router de Next.js 14
    api/
      barcode/[gtin]/     # Genera SVG/PNG del barcode
      config/             # GET/POST de la configuración
      products/           # CRUD de productos
      validate/           # Valida un GTIN externo
    generate/             # Form para generar código
    products/             # Catálogo + detalle
    settings/             # Configuración del prefijo
    validate/             # Validador
  components/             # Nav, Barcode (cliente)
  lib/
    types.ts              # Tipos del dominio
    gtin.ts               # Algoritmo Mod-10, validación, clasificación de prefijos
    db.ts                 # Storage en JSON con escritura atómica
    barcode.ts            # Wrapper sobre bwip-js
data/
  database.json           # Storage local (auto-generado)
```

La lógica de GTIN (`src/lib/gtin.ts`) es pura, sin dependencias, y portable a cualquier
backend (incluido Go). El algoritmo del dígito de control es:

```
checkDigit = (10 − (suma_ponderada mod 10)) mod 10
```

donde la base se recorre de derecha a izquierda alternando pesos `3, 1, 3, 1, ...`.

## Notas importantes sobre uso comercial

- **Asignación irreversible**: una vez asignado un GTIN a un producto, no debe reutilizarse para
  un producto distinto.
- **Nuevo GTIN cuando cambia el producto**: si cambia el contenido neto, las dimensiones del
  empaque o la formulación de manera que afecte a socios comerciales, debes asignar un GTIN
  nuevo.
- **Modo interno ≠ retail**: códigos en rango `20–29` NO son válidos para vender en
  supermercados, marketplaces o cualquier punto de venta abierto al público.
- **Responsabilidad del prefijo**: si vendes en retail, el prefijo debe estar asignado a tu
  empresa por GS1 Colombia (LOGYCA) u otra organización GS1 vigente.

## Backup

La base completa vive en `data/database.json`. Para hacer backup, copia ese archivo. Para
restaurar, simplemente reemplázalo.

## Licencia

Uso privado.
