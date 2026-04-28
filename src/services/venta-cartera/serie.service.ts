import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { HttpService } from '../HttpService';
import {
	SerieDetalle,
	SerieDetalleByIdResponse,
	SerieDetalleResponse,
	SerieEncabezado,
	SerieEncabezadoByIdResponse,
	SerieEncabezadoResponse,
} from '../../interfaces/venta-cartera/serie';

@Injectable({
	providedIn: 'root'
})
export class SerieService extends HttpService {

	private readonly endpoints = {
		serieEncabezado: '/serie/encabezado',
		serieDetalle: '/serie/detalle',
	};

	constructor(http: HttpClient, private toastr: ToastrService) {
		super(http);
	}

	async getSerieEncabezados({ page = 1, limit = 10, search = '', estado = '', all = false } = {}) {
		try {
			const params: Record<string, string | number | boolean> = { page, limit, search, all };
			if (estado) params['estado'] = estado;

			const resp = await firstValueFrom(
				this.get<SerieEncabezadoResponse>(this.endpoints.serieEncabezado, params)
			);

			return resp.body?.success ? resp.body : null;
		} catch (error: any) {
			console.error('Error en getSerieEncabezados:', error);
			this.toastr.error(error?.error?.message || '', 'Error al obtener series');
			return null;
		}
	}

	async getSerieEncabezadoById(serieId: string) {
		try {
			const resp = await firstValueFrom(
				this.get<SerieEncabezadoByIdResponse>(`${this.endpoints.serieEncabezado}/${serieId}`)
			);

			return resp.body?.success ? resp.body : null;
		} catch (error: any) {
			console.error('Error en getSerieEncabezadoById:', error);
			this.toastr.error(error?.error?.message || '', 'Error al obtener serie');
			return null;
		}
	}

	async createSerieEncabezado(
		data: SerieEncabezado & { detalles?: Array<Partial<SerieDetalle>> },
		showToast: boolean = true
	) {
		try {
			const payload = {
				identificador: data.identificador,
				empresaNombre: data.empresaNombre,
				empresaId: data.empresaId,
				observaciones: data.observaciones,
				estado: data.estado,
				usuarioNombre: data.usuarioNombre,
				usuarioId: data.usuarioId,
				detalles: data.detalles,
			};

			const resp = await firstValueFrom(
				this.post<SerieEncabezadoByIdResponse>(this.endpoints.serieEncabezado, payload)
			);

			if (resp.body?.success) {
				if (showToast) this.toastr.success(resp.body.message, 'Éxito');
				return resp.body;
			}

			return null;
		} catch (error: any) {
			console.error('Error en createSerieEncabezado:', error);
			this.toastr.error(error?.error?.message || '', 'Error al crear serie');
			return null;
		}
	}

	async updateSerieEncabezado(data: SerieEncabezado, showToast: boolean = true) {
		try {
			if (!data.serieId) throw new Error('ID de serie no proporcionado');

			const payload = {
				serieId: data.serieId,
				identificador: data.identificador,
				empresaNombre: data.empresaNombre,
				empresaId: data.empresaId,
				observaciones: data.observaciones,
				estado: data.estado,
				usuarioNombre: data.usuarioNombre,
				usuarioId: data.usuarioId,
			};

			const resp = await firstValueFrom(
				this.put<SerieEncabezadoByIdResponse>(`${this.endpoints.serieEncabezado}/${data.serieId}`, payload)
			);

			if (resp.body?.success) {
				if (showToast) this.toastr.success(resp.body.message, 'Éxito');
				return resp.body;
			}

			return null;
		} catch (error: any) {
			console.error('Error en updateSerieEncabezado:', error);
			this.toastr.error(error?.error?.message || '', 'Error al actualizar serie');
			return null;
		}
	}

	async deleteSerieEncabezado(serieId: string) {
		try {
			const resp = await firstValueFrom(
				this.delete<SerieEncabezadoByIdResponse>(`${this.endpoints.serieEncabezado}/${serieId}`)
			);

			if (resp.body?.success) {
				this.toastr.success(resp.body.message, 'Éxito');
				return resp.body;
			}

			return null;
		} catch (error: any) {
			console.error('Error en deleteSerieEncabezado:', error);
			this.toastr.error(error?.error?.message || '', 'Error al eliminar serie');
			return null;
		}
	}

	async getSerieDetalles({ page = 1, limit = 10, search = '', serieId = '', activo, all = false }: {
		page?: number;
		limit?: number;
		search?: string;
		serieId?: string;
		activo?: boolean;
		all?: boolean;
	} = {}) {
		try {
			const params: Record<string, string | number | boolean> = { page, limit, search, all };
			if (serieId) params['serieId'] = serieId;
			if (typeof activo === 'boolean') params['activo'] = activo;

			const resp = await firstValueFrom(
				this.get<SerieDetalleResponse>(this.endpoints.serieDetalle, params)
			);

			return resp.body?.success ? resp.body : null;
		} catch (error: any) {
			console.error('Error en getSerieDetalles:', error);
			this.toastr.error(error?.error?.message || '', 'Error al obtener detalles de serie');
			return null;
		}
	}

	async getSerieDetalleById(id: string) {
		try {
			const resp = await firstValueFrom(
				this.get<SerieDetalleByIdResponse>(`${this.endpoints.serieDetalle}/${id}`)
			);

			return resp.body?.success ? resp.body : null;
		} catch (error: any) {
			console.error('Error en getSerieDetalleById:', error);
			this.toastr.error(error?.error?.message || '', 'Error al obtener detalle de serie');
			return null;
		}
	}

	async createSerieDetalle(data: SerieDetalle, showToast: boolean = true) {
		try {
			const payload = {
				serieId: data.serieId,
				activo: data.activo,
				programa: data.programa,
				destinoCredito: data.destinoCredito,
				actividadCliente: data.actividadCliente,
				cuenta: data.cuenta,
				operacion: data.operacion,
				tipoOperacion: data.tipoOperacion,
				estado: data.estado,
				nombreCliente: data.nombreCliente,
				domicilioDepto: data.domicilioDepto,
				domicilioMuni: data.domicilioMuni,
				agenciaColocacion: data.agenciaColocacion,
				genero: data.genero,
				calificacionCliente: data.calificacionCliente,
				tipoGarantia: data.tipoGarantia,
				codigoGarantiaAsociado: data.codigoGarantiaAsociado,
				modalidadAmortizacionCapital: data.modalidadAmortizacionCapital,
				modalidadPagoIntereses: data.modalidadPagoIntereses,
				tipoTasa: data.tipoTasa,
				creditoReestructurado: data.creditoReestructurado,
				garantiaCompartidaExclusiva: data.garantiaCompartidaExclusiva,
				modulo: data.modulo,
				edad: data.edad,
				diasMora: data.diasMora,
				cantidadGarantia: data.cantidadGarantia,
				plazoMeses: data.plazoMeses,
				maduracionMeses: data.maduracionMeses,
				montoOtorgado: data.montoOtorgado,
				saldoCapital: data.saldoCapital,
				capitalMora: data.capitalMora,
				interesesMoratorios: data.interesesMoratorios,
				valorGarantiaActual: data.valorGarantiaActual,
				ltv: data.ltv,
				relacionGarantiaPrestamo: data.relacionGarantiaPrestamo,
				tasaInteresOrigen: data.tasaInteresOrigen,
				tasaInteresMensual: data.tasaInteresMensual,
				tasaMoraActual: data.tasaMoraActual,
				ingresosMensualesReportados: data.ingresosMensualesReportados,
				fechaNac: data.fechaNac,
				fechaOtorgamiento: data.fechaOtorgamiento,
				fechaVencimiento: data.fechaVencimiento,
			};

			const resp = await firstValueFrom(
				this.post<SerieDetalleByIdResponse>(this.endpoints.serieDetalle, payload)
			);

			if (resp.body?.success) {
				if (showToast) this.toastr.success(resp.body.message, 'Éxito');
				return resp.body;
			}

			return null;
		} catch (error: any) {
			console.error('Error en createSerieDetalle:', error);
			this.toastr.error(error?.error?.message || '', 'Error al crear detalle de serie');
			return null;
		}
	}

	async createSerieDetallesBatch(serieId: string, detalles: Array<Partial<SerieDetalle>>, showToast: boolean = false) {
		try {
			const payload = {
				serieId,
				detalles: detalles.map(data => ({
					activo: data.activo,
					programa: data.programa,
					destinoCredito: data.destinoCredito,
					actividadCliente: data.actividadCliente,
					cuenta: data.cuenta,
					operacion: data.operacion,
					tipoOperacion: data.tipoOperacion,
					estado: data.estado,
					nombreCliente: data.nombreCliente,
					domicilioDepto: data.domicilioDepto,
					domicilioMuni: data.domicilioMuni,
					agenciaColocacion: data.agenciaColocacion,
					genero: data.genero,
					calificacionCliente: data.calificacionCliente,
					tipoGarantia: data.tipoGarantia,
					codigoGarantiaAsociado: data.codigoGarantiaAsociado,
					modalidadAmortizacionCapital: data.modalidadAmortizacionCapital,
					modalidadPagoIntereses: data.modalidadPagoIntereses,
					tipoTasa: data.tipoTasa,
					creditoReestructurado: data.creditoReestructurado,
					garantiaCompartidaExclusiva: data.garantiaCompartidaExclusiva,
					modulo: data.modulo,
					edad: data.edad,
					diasMora: data.diasMora,
					cantidadGarantia: data.cantidadGarantia,
					plazoMeses: data.plazoMeses,
					maduracionMeses: data.maduracionMeses,
					montoOtorgado: data.montoOtorgado,
					saldoCapital: data.saldoCapital,
					capitalMora: data.capitalMora,
					interesesMoratorios: data.interesesMoratorios,
					valorGarantiaActual: data.valorGarantiaActual,
					ltv: data.ltv,
					relacionGarantiaPrestamo: data.relacionGarantiaPrestamo,
					tasaInteresOrigen: data.tasaInteresOrigen,
					tasaInteresMensual: data.tasaInteresMensual,
					tasaMoraActual: data.tasaMoraActual,
					ingresosMensualesReportados: data.ingresosMensualesReportados,
					fechaNac: data.fechaNac,
					fechaOtorgamiento: data.fechaOtorgamiento,
					fechaVencimiento: data.fechaVencimiento,
				})),
			};

			const resp = await firstValueFrom(
				this.post<SerieDetalleByIdResponse>(this.endpoints.serieDetalle, payload)
			);

			if (resp.body?.success) {
				if (showToast) this.toastr.success(resp.body.message, 'Éxito');
				return resp.body;
			}

			return null;
		} catch (error: any) {
			console.error('Error en createSerieDetallesBatch:', error);
			this.toastr.error(error?.error?.message || '', 'Error al crear detalles de serie');
			return null;
		}
	}

	async updateSerieDetalle(data: SerieDetalle) {
		try {
			if (!data.id) throw new Error('ID de detalle no proporcionado');

			const payload = {
				id: data.id,
				serieId: data.serieId,
				activo: data.activo,
				programa: data.programa,
				destinoCredito: data.destinoCredito,
				actividadCliente: data.actividadCliente,
				cuenta: data.cuenta,
				operacion: data.operacion,
				tipoOperacion: data.tipoOperacion,
				estado: data.estado,
				nombreCliente: data.nombreCliente,
				domicilioDepto: data.domicilioDepto,
				domicilioMuni: data.domicilioMuni,
				agenciaColocacion: data.agenciaColocacion,
				genero: data.genero,
				calificacionCliente: data.calificacionCliente,
				tipoGarantia: data.tipoGarantia,
				codigoGarantiaAsociado: data.codigoGarantiaAsociado,
				modalidadAmortizacionCapital: data.modalidadAmortizacionCapital,
				modalidadPagoIntereses: data.modalidadPagoIntereses,
				tipoTasa: data.tipoTasa,
				creditoReestructurado: data.creditoReestructurado,
				garantiaCompartidaExclusiva: data.garantiaCompartidaExclusiva,
				modulo: data.modulo,
				edad: data.edad,
				diasMora: data.diasMora,
				cantidadGarantia: data.cantidadGarantia,
				plazoMeses: data.plazoMeses,
				maduracionMeses: data.maduracionMeses,
				montoOtorgado: data.montoOtorgado,
				saldoCapital: data.saldoCapital,
				capitalMora: data.capitalMora,
				interesesMoratorios: data.interesesMoratorios,
				valorGarantiaActual: data.valorGarantiaActual,
				ltv: data.ltv,
				relacionGarantiaPrestamo: data.relacionGarantiaPrestamo,
				tasaInteresOrigen: data.tasaInteresOrigen,
				tasaInteresMensual: data.tasaInteresMensual,
				tasaMoraActual: data.tasaMoraActual,
				ingresosMensualesReportados: data.ingresosMensualesReportados,
				fechaNac: data.fechaNac,
				fechaOtorgamiento: data.fechaOtorgamiento,
				fechaVencimiento: data.fechaVencimiento,
			};

			const resp = await firstValueFrom(
				this.put<SerieDetalleByIdResponse>(`${this.endpoints.serieDetalle}/${data.id}`, payload)
			);

			if (resp.body?.success) {
				this.toastr.success(resp.body.message, 'Éxito');
				return resp.body;
			}

			return null;
		} catch (error: any) {
			console.error('Error en updateSerieDetalle:', error);
			this.toastr.error(error?.error?.message || '', 'Error al actualizar detalle de serie');
			return null;
		}
	}

	async deleteSerieDetalle(id: string) {
		try {
			const resp = await firstValueFrom(
				this.delete<SerieDetalleByIdResponse>(`${this.endpoints.serieDetalle}/${id}`)
			);

			if (resp.body?.success) {
				this.toastr.success(resp.body.message, 'Éxito');
				return resp.body;
			}

			return null;
		} catch (error: any) {
			console.error('Error en deleteSerieDetalle:', error);
			this.toastr.error(error?.error?.message || '', 'Error al eliminar detalle de serie');
			return null;
		}
	}
}
