// Tipos del dominio EAN/GTIN

export type GtinType = 'EAN-13' | 'EAN-8' | 'ITF-14';

export type PrefixMode = 'official' | 'internal';

export interface CompanyConfig {
  // Modo: oficial (prefijo GS1 real) o interno (rango 20-29, no para retail)
  mode: PrefixMode;
  // Nombre de la empresa o marca dueña de los códigos
  companyName: string;
  // País (informativo). En modo oficial debería coincidir con prefijo (ej: Colombia → 770/771)
  country: string;
  // Prefijo de empresa GS1 (sin dígito de control). Ej: "7701234"
  // En modo internal, usamos un prefijo arbitrario que comience con 20-29.
  companyPrefix: string;
  // Contador de la siguiente referencia secuencial a asignar
  nextReference: number;
  // Fecha de creación de la configuración
  createdAt: string;
  // Fecha de última actualización
  updatedAt: string;
}

export interface Product {
  id: string;
  gtin: string; // El GTIN completo con dígito de control
  gtinType: GtinType;
  name: string;
  sku?: string;
  brand?: string;
  category?: string;
  description?: string;
  notes?: string;
  // Atributos opcionales útiles para Meta/Google Shopping
  netContent?: string; // ej: "500 ml", "1 kg"
  unitPrice?: number; // COP por defecto
  currency?: string; // ISO 4217
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseShape {
  config: CompanyConfig | null;
  products: Product[];
  // Cuenta cuántas veces se ha asignado por tipo (para reportes)
  meta: {
    totalAssigned: number;
  };
}
