/**
 * ⚠️ MOCK TEMPORAL — Bantotal no está disponible.
 *
 * Simula la búsqueda de préstamo por DPI + operación con un listado fijo.
 * Para volver a consultar Bantotal: poner USAR_MOCK_BANTOTAL en false.
 * Para quitarlo por completo: borrar este archivo y el import/condición en generar-gyt-page.ts.
 */
import { Observable, of, throwError, timer } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import {
  BuscarPrestamoPorDocumentoParams,
  BuscarPrestamoPorDocumentoResponse
} from '../../../../../interfaces/api-bantotal/prestamo';

export const USAR_MOCK_BANTOTAL = true;

interface PrestamoMock {
  documento: string;
  operacion: number;
  tipoDocumento: string;
  monto: number;
  cuenta: number;
  subOperacion: number;
  tipoOperacion: number;
  agenciaId: number;
  agencia: string;
  // Los datos recibidos no incluyen nombres; reemplazar si se conocen
  nombres: string;
  apellidos: string;
}

const PRESTAMOS_MOCK: PrestamoMock[] = [
  { documento: '1879394380105', operacion: 452027, tipoDocumento: 'DPI', monto: 14112.25, cuenta: 1697,   subOperacion: 0, tipoOperacion: 0, agenciaId: 101, agencia: 'AGENCIA CHIMALTENANGO', nombres: 'MARILU FRANCO CATALAN', apellidos: 'SIN APELLIDO' },
  { documento: '6543234590101', operacion: 457649, tipoDocumento: 'DPI', monto: 11459.8,  cuenta: 221606, subOperacion: 0, tipoOperacion: 0, agenciaId: 101, agencia: 'AGENCIA CHIMALTENANGO', nombres: 'JENNIFER ALEJANDRA RAMIREZ HERNANDEZ', apellidos: 'SIN APELLIDO' },
  { documento: '1885058572102', operacion: 456436, tipoDocumento: 'DPI', monto: 14419,    cuenta: 54977,  subOperacion: 0, tipoOperacion: 0, agenciaId: 602, agencia: 'AGENCIA JALAPA',        nombres: 'ERMERITO GOMEZ GUTIERREZ', apellidos: 'SIN APELLIDO' },
  { documento: '1667940150201', operacion: 457654, tipoDocumento: 'DPI', monto: 7000,     cuenta: 221621, subOperacion: 0, tipoOperacion: 0, agenciaId: 501, agencia: 'AGENCIA TECPAN',        nombres: 'JAUREGUI DEL CID ESTEFANI ABIGAIL', apellidos: 'SIN APELLIDO' },
  { documento: '2605652962214', operacion: 457641, tipoDocumento: 'DPI', monto: 3000,     cuenta: 51183,  subOperacion: 0, tipoOperacion: 0, agenciaId: 605, agencia: 'AGENCIA CHIQUIMULILLA', nombres: 'MARBIN ELIAS CRISTALES GONZALEZ', apellidos: 'SIN APELLIDO' },
];

/**
 * Acepta la operación como "452027" o con formato "0000452027-000"
 */
function normalizarOperacion(operacion: string): number {
  return Number(operacion.trim().split('-')[0]);
}

export function buscarPrestamoMock(
  params: BuscarPrestamoPorDocumentoParams
): Observable<BuscarPrestamoPorDocumentoResponse> {
  const operacion = normalizarOperacion(params.prestamo);
  const p = PRESTAMOS_MOCK.find(m => m.documento === params.documento.trim() && m.operacion === operacion);

  // Pequeño retardo para simular la llamada
  return timer(400).pipe(
    mergeMap(() => {
      if (!p) {
        // Misma forma que el error 404 del backend, para reutilizar el manejo de errores de la página
        return throwError(() => ({
          status: 404,
          error: { data: { message: 'No se encontró el préstamo para el documento y operación ingresados' } }
        }));
      }

      const idOperacionFmt = `${String(p.operacion).padStart(10, '0')}-000`;

      return of<BuscarPrestamoPorDocumentoResponse>({
        persona: {
          personaUId: 0,
          primerNombre: p.nombres,
          primerApellido: p.apellidos,
          tipoDocumento: p.tipoDocumento,
          numeroDocumento: p.documento,
          pais: 320
        },
        cliente: {
          clienteUId: p.cuenta,
          cuentas: []
        },
        prestamo: {
          operacionUId: p.operacion,
          idOperacionFmt,
          idOperacionBT: idOperacionFmt,
          producto: { productoUId: 0, nombre: '', moneda: 'GTQ' },
          sucursal: p.agencia,
          saldo: p.monto,
          estado: 'NORMAL',
          detalles: [{
            Codigo_barras: '',
            Cuenta_Cliente: p.cuenta,
            Fecha: new Date().toISOString(),
            ID_Agencia: p.agenciaId,
            Nombre_Agencia: p.agencia,
            Id_Transaccion: '',
            Itmod: 0,
            Itnrel: 0,
            Itsuc: 0,
            Ittran: 0,
            Ittope: p.tipoOperacion,
            Numero_Operacion: p.operacion,
            Referencia: '',
            Sub_Operacion: p.subOperacion,
            Valor: p.monto,
            cam_carga_tipo: 0,
            codigo: 0,
            codigo_cuenta_destino: 0,
            id_banco_destino: 0,
            moneda: 0,
            numero_de_cuenta: ''
          }]
        }
      });
    })
  );
}
