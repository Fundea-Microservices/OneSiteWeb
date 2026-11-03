import { ApiResponse, Metadata } from './catalogo';

export type EstadoFlujo = 'CREADO' | 'RECHAZADO' | 'CORREGIDO' | 'ACEPTADO' | 'ANULADO';

export const ESTADOS_FLUJO: EstadoFlujo[] = ['CREADO', 'RECHAZADO', 'CORREGIDO', 'ACEPTADO', 'ANULADO'];

/** Límites del contrato (deben coincidir con ProyeccionFlujoDto, OtroPrestamoDto y EstacionalDto del gateway). */
export const MAX_LINEAS_FLUJO = 50;
export const MAX_OTROS_PRESTAMOS = 20;
export const MAX_TASA_INTERES_ANUAL = 999.9999;
export const MAX_ESTACIONALES = 20;
export const MAX_TRANSACCIONES_ESTACIONAL = 100;

/** Plazo de todo flujo nuevo: por ahora no se elige (el gateway acepta de 1 a 36). */
export const PLAZO_FLUJO_MESES = 24;

export type TipoTransaccion = 'INGRESO' | 'EGRESO';

export type FormaPago = 'MENSUAL' | 'BIMESTRAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL';

/** Cada cuántos meses cae una cuota. */
export const FORMAS_PAGO: { value: FormaPago; label: string; meses: number }[] = [
    { value: 'MENSUAL', label: 'Mensual', meses: 1 },
    { value: 'BIMESTRAL', label: 'Bimestral', meses: 2 },
    { value: 'TRIMESTRAL', label: 'Trimestral', meses: 3 },
    { value: 'SEMESTRAL', label: 'Semestral', meses: 6 },
    { value: 'ANUAL', label: 'Anual', meses: 12 },
];

// ---------- Solicitud en Bantotal ----------
/** Datos de apoyo de la solicitud: solo se muestran, no se guardan en el flujo. */
export interface IReferenciasSolicitud {
    clienteUId: number;
    personaUId: number;
    asesor: string;
    tipoEvaluacion: number;
    tarea: string;
}

/** Detalle de la solicitud (GET /detalle/:numeroSolicitud): lo que se copia al flujo al crearlo, más `referencias`. */
export interface ISolicitudCreditoBantotal {
    numeroSolicitud: number;
    numeroOperacion: number | null;
    cuenta: string;
    documento: string;
    nombreCliente: string;
    montoCredito: number;
    // Si el asesor no tiene agencias asignadas, agencia y región (id y nombre) llegan en null
    agenciaId: number | null;
    agencia: string | null;
    regionId: number | null;
    region: string | null;
    evaluacion: string | null;
    clasificacion: string | null;
    fechaEvaluacion: string | null; // YYYY-MM-DD
    referencias: IReferenciasSolicitud;
}

// ---------- Flujo ----------
export interface IFlujoEncabezado {
    id: string;
    codigo: string;              // FF-000001
    numeroSolicitud: number;
    numeroOperacion: number | null;
    cuenta: string;
    documento: string;
    nombreCliente: string;
    montoCredito: number;
    agenciaId: number | null;
    agencia: string | null;
    regionId: number | null;
    region: string | null;
    evaluacion: string | null;
    clasificacion: string | null;
    fechaEvaluacion: string | null;
    fechaInicio: string;         // YYYY-MM-01
    plazoMeses: number;
    estado: EstadoFlujo;
    usuarioId: string;
    created_at: string;
    updated_at: string | null;
}

/** Lo que se envía por cada línea. */
export interface ILineaFlujoInput {
    actividadEconomicaId: string;
    nombre: string;              // máx. 150
    fechaSiembra: string;        // YYYY-MM-DD, su mes es el mes 1 del ciclo
    cantidad: number;            // > 0, máx. 2 decimales, en la unidadGiro de la actividad
}

/** Línea guardada: incluye la copia de los datos de la actividad. */
export interface ILineaFlujo extends ILineaFlujoInput {
    id?: string;
    orden?: number;
    codigoActividad: string;
    nombreActividad: string;
    unidadGiro: string;
    medidaProduccion: string;
    ciclo: number;
    cantidadEstimada: number;
    precioU: number;
    costoU: number | null;
}

// ---------- Préstamos en otras instituciones ----------
/** Lo que se envía por cada préstamo. */
export interface IOtroPrestamoInput {
    institucion: string;         // máx. 150
    montoPrestamo: number;       // > 0, máx. 2 decimales; informativo, el cálculo parte del saldo
    saldo: number;               // > 0, máx. 2 decimales, no mayor que montoPrestamo
    cuota: number;               // > 0, máx. 2 decimales
    formaPago: FormaPago;
    fechaSiguientePago: string;  // YYYY-MM-DD, primera cuota del calendario
    tasaInteresAnual: number;    // 0 .. 999.9999, máx. 4 decimales
}

export interface ICuotaPrestamo {
    numeroCuota: number;
    fecha: string;               // YYYY-MM-DD
    cuota: number;               // la última puede ser menor: saldo pendiente + su interés
    capital: number;
    interes: number;
    saldo: number;
}

/** Préstamo con su calendario (POST /calendario-prestamo y otrosPrestamos de las respuestas). */
export interface IOtroPrestamo extends IOtroPrestamoInput {
    id?: string;                 // solo cuando ya está guardado
    orden: number;
    tasaPeriodo: number;         // tasa anual / 12 × meses del periodo
    numeroCuotas: number;
    fechaUltimoPago: string;
    totalInteres: number;
    totalPagado: number;
    calendario: ICuotaPrestamo[];
}

export interface IMesPrestamoProyeccion {
    numeroMes: number;
    periodo: string;
    cuota: number;               // 0 en los meses sin pago
    capital: number;
    interes: number;
}

export interface IFilaPrestamoProyeccion {
    prestamoId: string | null;
    orden: number;
    institucion: string;
    formaPago: FormaPago;
    meses: IMesPrestamoProyeccion[]; // todos los meses del horizonte
    totalCuota: number;              // solo las cuotas dentro del horizonte
}

// ---------- Actividades estacionales ----------
/** Ingreso o egreso por fuera de las actividades del catálogo (p. ej. venta de duraznos). */
export interface ITransaccionEstacionalInput {
    concepto: string;            // máx. 150
    tipo: TipoTransaccion;
    fecha: string;               // YYYY-MM-DD; fuera del horizonte se guarda pero no se proyecta
    monto: number;               // > 0, máx. 2 decimales; el signo lo da el tipo
}

export interface IEstacionalInput {
    descripcion: string;         // máx. 150
    transacciones: ITransaccionEstacionalInput[]; // 1 .. 100
}

export interface ITransaccionEstacional extends ITransaccionEstacionalInput {
    id?: string;                 // al simular no viene
    fueraDeHorizonte: boolean;
}

export interface IEstacional {
    id?: string;                 // al simular no viene
    orden: number;
    descripcion: string;
    // Suman todas las transacciones, también las que están fuera del horizonte
    totalIngreso: number;
    totalEgreso: number;
    margenNeto: number;
    transaccionesFueraDeHorizonte: number;
    transacciones: ITransaccionEstacional[]; // ordenadas por fecha
}

export interface IMesEstacionalProyeccion {
    numeroMes: number;
    periodo: string;
    ingreso: number;             // 0 en los meses sin movimientos
    egreso: number;
}

export interface IFilaEstacionalProyeccion {
    estacionalId: string | null;
    orden: number;
    descripcion: string;
    meses: IMesEstacionalProyeccion[]; // todos los meses del horizonte
    totalIngreso: number;              // solo lo que cae dentro del horizonte
    totalEgreso: number;
}

export interface IMesProyeccion {
    numeroMes: number;
    periodo: string;             // YYYY-MM-01
    mesCiclo?: number | null;    // null fuera del ciclo; no viene si está agrupado
    porcentajeIngreso?: number;
    porcentajeEgreso?: number;
    ingreso: number;
    egreso: number;
}

export interface IFilaProyeccion {
    lineaId: string | null;      // null si está agrupado
    actividadEconomicaId: string;
    codigoActividad: string;
    nombreActividad: string;
    nombre: string | null;       // null si está agrupado
    fechaSiembra: string | null; // null si está agrupado
    cantidad: number;
    lineas: number;              // cuántas líneas se sumaron
    meses: IMesProyeccion[];
    totalIngreso: number;
    totalEgreso: number;
}

export interface IMesTotal {
    numeroMes: number;
    periodo: string;
    ingreso: number;             // solo las actividades del catálogo
    egreso: number;              // solo las actividades del catálogo
    ingresoEstacional: number;
    egresoEstacional: number;
    pagoPrestamos: number;
    neto: number;                // ingreso − egreso + ingresoEstacional − egresoEstacional − pagoPrestamos
    acumulado: number;
}

export interface IProyeccionFlujo {
    agrupado: boolean;
    filas: IFilaProyeccion[];
    estacionales: IFilaEstacionalProyeccion[];
    prestamos: IFilaPrestamoProyeccion[];
    totales: {
        meses: IMesTotal[];
        totalIngreso: number;
        totalEgreso: number;
        totalIngresoEstacional: number;
        totalEgresoEstacional: number;
        totalPagoPrestamos: number;
        neto: number;            // igual al acumulado del último mes
    };
}

export interface IFlujoDetalle extends IFlujoEncabezado {
    editable: boolean;
    estadosSiguientes: EstadoFlujo[];
    lineas: ILineaFlujo[];
    otrosPrestamos: IOtroPrestamo[];
    estacionales: IEstacional[];
    proyeccion: IProyeccionFlujo;
}

export interface ISimulacionFlujo {
    fechaInicio: string;
    plazoMeses: number;
    lineas: ILineaFlujo[];
    otrosPrestamos: IOtroPrestamo[];
    estacionales: IEstacional[];
    proyeccion: IProyeccionFlujo;
}

// ---------- Resumen de actividades ----------
export interface IMontoAnioResumen {
    anio: number;
    ingreso: number;
    egreso: number;
    neto: number;                // ingreso − egreso
}

/** Año del resumen: 12 meses seguidos desde el mes de inicio, no el año calendario. */
export interface IAnioResumen {
    anio: number;
    desde: string;               // YYYY-MM-01 del primer mes
    hasta: string;               // YYYY-MM-01 del último mes
    mesesProyectados: number;    // 0 .. 12: menos de 12 si el plazo no cubre todo el año
}

/** Una fila por actividad: suma las siembras con el mismo nombre y unidad. */
export interface IFilaResumen {
    codigosActividad: string[];
    nombreActividad: string;
    actividad: string;           // nombre de la opción de ACTI
    subActividad: string;        // nombre de la opción de SUB-ACT
    unidadGiro: string;          // nombre de la opción de UNI-GIR
    ciclo: number;               // el más largo de las siembras
    fechaSiembra: string;        // la más antigua de las siembras
    cantidad: number;            // suma de las siembras
    lineas: number;
    anios: IMontoAnioResumen[];
    margenNeto: number;
}

export interface IResumenActividades {
    id: string;
    codigo: string;
    fechaInicio: string;
    plazoMeses: number;
    anios: IAnioResumen[];
    filas: IFilaResumen[];
    totales: {
        anios: IMontoAnioResumen[];
        margenNeto: number;
    };
}

// ---------- Bodies ----------
export interface IProyeccionFlujoInput {
    fechaInicio: string;         // YYYY-MM-DD (se usa el día 1 de su mes)
    plazoMeses: number;          // 1 .. 36
    lineas: ILineaFlujoInput[];  // 1 .. 50
    otrosPrestamos?: IOtroPrestamoInput[]; // 0 .. 20
    estacionales?: IEstacionalInput[];     // 0 .. 20, cada una con al menos 1 transacción
}

export interface ISimularFlujoInput extends IProyeccionFlujoInput {
    agrupar?: boolean;
}

export interface IFlujoCreate extends IProyeccionFlujoInput {
    numeroSolicitud: number;
}

// ---------- Respuestas ----------
export type ConsultaSolicitudResponse = ApiResponse<{
    solicitud: ISolicitudCreditoBantotal;
    flujoActivo: IFlujoEncabezado | null;
}>;
export type SimulacionFlujoResponse = ApiResponse<ISimulacionFlujo>;
export type CalendarioPrestamoResponse = ApiResponse<IOtroPrestamo>;
export type FlujoDetalleResponse = ApiResponse<IFlujoDetalle>;
export type ResumenActividadesResponse = ApiResponse<IResumenActividades>;
export type FlujosResponse = ApiResponse<{ flujos: IFlujoEncabezado[]; metadata: Metadata }>;

/** Flujo no anulado que ya existe para la solicitud (409 MS-FJF-42-01). */
export interface IFlujoExistente {
    id: string;
    codigo: string;
    estado: EstadoFlujo;
}

export const CLASE_ESTADO_FLUJO: Record<EstadoFlujo, string> = {
    CREADO: 'text-bg-primary',
    RECHAZADO: 'text-bg-danger',
    CORREGIDO: 'text-bg-warning',
    ACEPTADO: 'text-bg-success',
    ANULADO: 'text-bg-secondary',
};
