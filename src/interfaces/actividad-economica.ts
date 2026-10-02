import { ApiResponse, Metadata } from './catalogo';

export type TipoDistribucion = 'INGRESO' | 'EGRESO';

export interface IDistribucion {
    tipo: TipoDistribucion;
    numero: number;      // mes del ciclo: 1 .. 12 (el mes 1 es el inicio del ciclo, no enero)
    porcentaje: number;  // 0 .. 100, máx. 2 decimales
}

// Lo que devuelve el GET (cada fila trae datos extra)
export interface IDistribucionGuardada extends IDistribucion {
    id: string;
    actividadEconomicaId: string;
    created_at: string;
    updated_at: string | null;
}

export interface IActividadEconomica {
    id: string;
    codigo: string;              // ACT-001, generado por el sistema
    nombre: string;
    giro: string;                // código de opción de GIRO
    unidadGiro: string;          // código de opción de UNGI
    region: string;              // código de opción de REGION
    actividad: string;           // código de opción de ACTI
    subActividad: string;        // código de opción de SUB-ACT
    area: string | null;         // código de opción de CUERDA
    descripcion: string | null;
    ciclo: number;               // duración en meses
    medidaProduccion: string;    // código de opción de MED-PRO
    cantidadEstimada: number;
    precioU: number;
    costoU: number | null;
    distribucion?: IDistribucionGuardada[]; // solo en GET /:id, POST y PUT
    created_at: string;
    updated_at: string | null;
    deleted_at: string | null;
}

export interface IActividadCreate {
    nombre: string;              // máx. 150
    giro: string;
    unidadGiro: string;
    region: string;
    actividad: string;
    subActividad: string;
    area?: string | null;
    descripcion?: string | null; // máx. 500
    ciclo: number;               // entero >= 1
    medidaProduccion: string;
    cantidadEstimada: number;    // >= 0, máx. 2 decimales
    precioU: number;             // >= 0, máx. 2 decimales
    costoU?: number | null;      // >= 0, máx. 2 decimales
    distribucion?: IDistribucion[]; // máx. 24 (12 ingresos + 12 egresos)
}

export interface IActividadUpdate extends Partial<IActividadCreate> {
    id: string;
}

export type ActividadesResponse = ApiResponse<{ actividades: IActividadEconomica[]; metadata: Metadata }>;
export type ActividadResponse = ApiResponse<IActividadEconomica>;

/** Catálogo del que sale cada campo (debe coincidir con CATALOGOS del microservicio). */
export const CATALOGOS_ACTIVIDAD = {
    giro: 'GIRO',
    unidadGiro: 'UNI-GIR',
    region: 'REGION',
    actividad: 'ACTI',
    subActividad: 'SUB-ACT',
    area: 'CUERDA',
    medidaProduccion: 'MED-PRO',
} as const;

export type CampoCatalogoActividad = keyof typeof CATALOGOS_ACTIVIDAD;

/** Opción de unidad de giro con la que se muestra el campo `area`. */
export const UNIDAD_GIRO_CUERDAS = 'CUERDAS';
