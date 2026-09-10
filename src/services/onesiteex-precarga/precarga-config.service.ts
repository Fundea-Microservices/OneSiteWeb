import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { HttpService } from '../HttpService';
import {
  ICreateConfigEncabezado,
  IConfigEncabezado,
  IConfigEncabezadoConDetalle,
  IConfigFilters,
  IDecisionesCarga,
  IResultadoCarga,
  IUpdateConfigEncabezado,
  IValidacionArchivo,
  PrecargaListResponse,
  PrecargaSingleResponse,
} from '../../interfaces/onesiteex-precarga/onesiteex-precarga';

@Injectable({ providedIn: 'root' })
export class PrecargaConfigService extends HttpService {
  private readonly base = '/onesiteex/precarga/config';

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
  }

  /** Listado paginado de encabezados. No incluye el detalle. */
  async getConfigs({ page = 1, limit = 10, search = '', idEncuesta, activo, all }: IConfigFilters = {}) {
    try {
      const params: any = all ? { all: true } : { page, limit };
      if (search) params['search'] = search;
      if (idEncuesta != null) params['idEncuesta'] = idEncuesta;
      if (activo !== undefined) params['activo'] = activo;
      const resp = await firstValueFrom(this.get<PrecargaListResponse<IConfigEncabezado>>(this.base, params));
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error en configuraciones de precarga');
      return null;
    }
  }

  /** Encabezado + detalle. Es lo que llena el formulario de edición. */
  async getConfigById(id: string) {
    try {
      const resp = await firstValueFrom(
        this.get<PrecargaSingleResponse<IConfigEncabezadoConDetalle>>(`${this.base}/${id}`)
      );
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error en configuraciones de precarga');
      return null;
    }
  }

  /** Crea el encabezado y su detalle en una sola transacción. */
  async createConfig(dto: ICreateConfigEncabezado) {
    try {
      const resp = await firstValueFrom(
        this.post<PrecargaSingleResponse<IConfigEncabezadoConDetalle>>(this.base, dto)
      );
      if (resp.body?.success) { this.toastr.success(resp.body.message || 'Configuración creada', 'Éxito'); return resp.body; }
      return null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al crear la configuración');
      return null;
    }
  }

  /** Si el body trae `detalles`, reemplaza el detalle completo. La versión siempre sube. */
  async updateConfig(id: string, dto: IUpdateConfigEncabezado) {
    try {
      const resp = await firstValueFrom(
        this.put<PrecargaSingleResponse<IConfigEncabezadoConDetalle>>(`${this.base}/${id}`, dto)
      );
      if (resp.body?.success) { this.toastr.success(resp.body.message || 'Configuración actualizada', 'Éxito'); return resp.body; }
      return null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al actualizar la configuración');
      return null;
    }
  }

  /** Borrado lógico. El microservicio responde 409 si la configuración ya tiene precargas activas. */
  async deleteConfig(id: string) {
    try {
      const resp = await firstValueFrom(this.delete<PrecargaSingleResponse<{ id: string }>>(`${this.base}/${id}`));
      if (resp.body?.success) { this.toastr.success(resp.body.message || 'Configuración eliminada', 'Éxito'); return resp.body; }
      return null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al eliminar la configuración');
      return null;
    }
  }

  /** Descarga la plantilla .xlsx de una configuración (CODIGO_EMPRESA, USUARIO_ENCUESTADOR + una columna por pregunta). */
  async descargarPlantilla(config: IConfigEncabezado): Promise<boolean> {
    try {
      const resp = await firstValueFrom(this.getBlob(`${this.base}/${config.id}/plantilla`));
      const blob = resp.body;
      if (!blob) return false;

      const nombre = this.obtenerNombreArchivo(resp.headers.get('Content-Disposition')) ?? `precarga_${config.nombre}.xlsx`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombre;
      a.click();
      URL.revokeObjectURL(url);
      return true;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'No se pudo generar la plantilla');
      return false;
    }
  }

  /** Extrae el filename del header Content-Disposition, si viene. */
  private obtenerNombreArchivo(contentDisposition: string | null): string | null {
    if (!contentDisposition) return null;
    const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(contentDisposition);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  }

  /**
   * PASO 1. Analiza el Excel contra la configuración: reporta filas nuevas,
   * duplicadas (con motivo) y con error. No escribe nada en la base.
   */
  async validarArchivo(idConfiguracion: string, archivo: File) {
    try {
      const formData = new FormData();
      formData.append('archivo', archivo, archivo.name);
      const resp = await firstValueFrom(
        this.postFormData<PrecargaSingleResponse<IValidacionArchivo>>(`${this.base}/${idConfiguracion}/validar`, formData)
      );
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al validar el archivo');
      return null;
    }
  }

  /**
   * PASO 2. Confirma la carga con las decisiones del usuario sobre duplicados
   * y errores. Se manda el mismo File del paso 1: el servidor no lo conserva
   * entre llamadas.
   */
  async confirmarCarga(idConfiguracion: string, archivo: File, decisiones: IDecisionesCarga) {
    try {
      const formData = new FormData();
      formData.append('archivo', archivo, archivo.name);
      formData.append('usuarioCrea', decisiones.usuarioCrea);
      if (decisiones.duplicados) formData.append('duplicados', decisiones.duplicados);
      if (decisiones.procesarConErrores !== undefined) {
        formData.append('procesarConErrores', String(decisiones.procesarConErrores));
      }
      const resp = await firstValueFrom(
        this.postFormData<PrecargaSingleResponse<IResultadoCarga>>(`${this.base}/${idConfiguracion}/carga-masiva`, formData)
      );
      if (resp.body?.success) {
        const r = resp.body.data?.resumen;
        if (r?.conError || r?.duplicadas) this.toastr.info(resp.body.message || '', 'Carga finalizada');
        else this.toastr.success(resp.body.message || 'Carga finalizada', 'Éxito');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al confirmar la carga');
      return null;
    }
  }
}
