import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { HttpService } from '../HttpService';
import {
  CreateJobDto,
  JobDeleteResponse,
  JobEjecucionFiltros,
  JobEjecucionListResponse,
  JobEjecucionResponse,
  JobEjecutarResponse,
  JobFiltros,
  JobListResponse,
  JobResponse,
  UpdateJobDto,
} from '../../interfaces/jobs/job';

@Injectable({
  providedIn: 'root',
})
export class JobsService extends HttpService {

  private readonly endpoints = {
    jobs: '/jobs',
    ejecuciones: '/jobs/ejecuciones',
  };

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
  }

  /** `message` llega como string o como string[] (errores de validación). */
  private mensajeError(error: any): string {
    const message = error?.error?.message;
    return Array.isArray(message) ? message.join(' · ') : message || '';
  }

  // ─── JOBS: CONSULTA (cualquier usuario autenticado) ────────────

  async getJobs({ page = 1, limit = 10, search, active, all }: JobFiltros = {}) {
    try {
      const params: Record<string, string | number | boolean> = { page, limit };
      if (search) params['search'] = search;
      if (active !== undefined) params['active'] = active;
      if (all) params['all'] = true;
      const resp = await firstValueFrom(
        this.get<JobListResponse>(this.endpoints.jobs, params)
      );
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      this.toastr.error(this.mensajeError(error), 'Error al obtener jobs');
      return null;
    }
  }

  async getJobById(jobId: string) {
    try {
      const resp = await firstValueFrom(
        this.get<JobResponse>(`${this.endpoints.jobs}/${jobId}`)
      );
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      this.toastr.error(this.mensajeError(error), 'Error al obtener job');
      return null;
    }
  }

  // ─── JOBS: ADMINISTRACIÓN (Admin, el API responde 403) ─────────

  async createJob(datos: CreateJobDto) {
    try {
      const resp = await firstValueFrom(
        this.post<JobResponse>(this.endpoints.jobs, datos)
      );
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Éxito');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      this.toastr.error(this.mensajeError(error), 'Error al crear job');
      return null;
    }
  }

  /** Solo se envían los campos que cambian; el id va en la URL, nunca en el body. */
  async updateJob(jobId: string, cambios: UpdateJobDto) {
    try {
      const resp = await firstValueFrom(
        this.put<JobResponse>(`${this.endpoints.jobs}/${jobId}`, cambios)
      );
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Éxito');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      this.toastr.error(this.mensajeError(error), 'Error al actualizar job');
      return null;
    }
  }

  /** Borrado lógico: el job deja de aparecer en los listados. */
  async deleteJob(jobId: string) {
    try {
      const resp = await firstValueFrom(
        this.delete<JobDeleteResponse>(`${this.endpoints.jobs}/${jobId}`)
      );
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Éxito');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      this.toastr.error(this.mensajeError(error), 'Error al eliminar job');
      return null;
    }
  }

  /**
   * Ejecuta el job ahora (también si está inactivo). La API no espera a que termine:
   * devuelve la ejecución creada y el resultado se consulta con `getEjecucionById`
   * hasta que `exitoso` deje de ser null.
   */
  async ejecutarJob(jobId: string) {
    try {
      const resp = await firstValueFrom(
        this.post<JobEjecutarResponse>(`${this.endpoints.jobs}/${jobId}/ejecutar`, {})
      );
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      if (error?.status === 409) {
        this.toastr.warning(this.mensajeError(error), 'El job ya se está ejecutando');
      } else {
        this.toastr.error(this.mensajeError(error), 'Error al ejecutar job');
      }
      return null;
    }
  }

  // ─── EJECUCIONES (bitácora, solo lectura) ──────────────────────
  // La bitácora la registra el sistema automáticamente; no se crea ni se edita desde el front.

  /** Ordenadas por `fechaEjecucion` descendente (más reciente primero). */
  async getEjecuciones({ page = 1, limit = 10, jobId, exitoso }: JobEjecucionFiltros = {}) {
    try {
      const params: Record<string, string | number | boolean> = { page, limit };
      if (jobId) params['jobId'] = jobId;
      if (exitoso !== undefined) params['exitoso'] = exitoso;
      const resp = await firstValueFrom(
        this.get<JobEjecucionListResponse>(this.endpoints.ejecuciones, params)
      );
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      this.toastr.error(this.mensajeError(error), 'Error al obtener la bitácora');
      return null;
    }
  }

  async getEjecucionById(ejecucionId: string) {
    try {
      const resp = await firstValueFrom(
        this.get<JobEjecucionResponse>(`${this.endpoints.ejecuciones}/${ejecucionId}`)
      );
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      this.toastr.error(this.mensajeError(error), 'Error al obtener la ejecución');
      return null;
    }
  }
}
