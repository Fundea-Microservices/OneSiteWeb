import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpService } from '../HttpService';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { 
  FormEncabezado, 
  FormEncabezadoByIdResponse, 
  FormEncabezadoResponse,
  FormEncabezadoCompleto,
  FormEncabezadoCompletoResponse,
  FormSeccion,
  FormSeccionResponse,
  FormSeccionByIdResponse,
  FormPregunta,
  FormPreguntaResponse,
  FormPreguntaByIdResponse,
} from '../../interfaces/configuracion';

@Injectable({
  providedIn: 'root'
})
export class FormulariosService extends HttpService {

  private readonly endpoints = {
    formularioEncabezado:    '/formulario/encabezado',
    formularioSeccion:       '/formulario/seccion',
    formularioPregunta:      '/formulario/pregunta',
    formularioObtenerValores: '/formulario/obtener-valores',
  };

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
  }

  async getFormEncabezados({ page = 1, limit = 10, search = '' } = {}) {
    try {
      const params: any = { page, limit, search };
      const resp = await firstValueFrom(this.get<FormEncabezadoResponse>(`${this.endpoints.formularioEncabezado}`, params));
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      console.error("Error en getFormEncabezados:", error);
      this.toastr.error(error?.error?.message || '', 'Error al obtener encabezados');
      return null;
    }
  }

  async getFormEncabezadoById(id: string) {
    try {
      const resp = await firstValueFrom(this.get<FormEncabezadoByIdResponse>(`${this.endpoints.formularioEncabezado}/${id}`));
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      console.error("Error en getFormEncabezadoById:", error);
      this.toastr.error(error?.error?.message || '', 'Error al obtener encabezado');
      return null;
    }
  }

  async getFormCompleto(id: string) {
    try {
      const resp = await firstValueFrom(this.get<FormEncabezadoCompletoResponse>(`${this.endpoints.formularioEncabezado}/${id}`));
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      console.error("Error en getFormCompleto:", error);
      this.toastr.error(error?.error?.message || '', 'Error al obtener formulario completo');
      return null;
    }
  }

  async obtenerValoresFormulario(encabezadoId: string, padreId: string): Promise<{ preguntaId: string; valor: string; campo?: string; seccion?: string; orden?: number; tipo?: string }[]> {
    try {
      const resp = await firstValueFrom(
        this.post<any>(this.endpoints.formularioObtenerValores, { encabezadoId, padreId })
      );
      console.log("🚀 ~ FormulariosService ~ obtenerValoresFormulario ~ resp:", resp)
      if (resp.body?.success) {
        return Array.isArray(resp.body.data.datosAdicionales) ? resp.body.data.datosAdicionales : [];
      }
      throw new Error(resp.body?.message || 'Error al obtener valores del formulario');
    } catch (error: any) {
      console.error('Error en obtenerValoresFormulario:', error);
      throw error;
    }
  }

  async createFormEncabezado(data: FormEncabezado) {
    try {
      // 🛡️ Filtramos solo los campos permitidos por el CreateEncabezadoDto
      const payload = {
        nombre: data.nombre,
        descripcion: data.descripcion,
        categoria: data.categoria,
        tabla: data.tabla,
        activo: data.activo
      };

      const resp = await firstValueFrom(this.post<FormEncabezadoByIdResponse>(this.endpoints.formularioEncabezado, payload));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Éxito');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.error("Error en createFormEncabezado:", error);
      this.toastr.error(error?.error?.message || '', 'Error al crear encabezado');
      return null;
    }
  }

  async updateFormEncabezado(data: FormEncabezado) {
    try {
      if (!data.formId) throw new Error("ID de formulario no proporcionado");

      // 🛡️ Filtramos solo los campos permitidos por el UpdateEncabezadoDto
      // formId se envía tanto en URL como en body según el controlador
      const payload = {
        formId: data.formId,
        nombre: data.nombre,
        descripcion: data.descripcion,
        categoria: data.categoria,
        tabla: data.tabla,
        activo: data.activo
      };

      // URL correcta según el controlador: PUT /formulario/encabezado/:formId
      const url = `${this.endpoints.formularioEncabezado}/${data.formId}`;
      const resp = await firstValueFrom(this.put<FormEncabezadoByIdResponse>(url, payload));
      
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Éxito');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.error("Error en updateFormEncabezado:", error);
      this.toastr.error(error?.error?.message || '', 'Error al actualizar encabezado');
      return null;
    }
  }

  async deleteFormEncabezado(id: string) {
    try {
      const resp = await firstValueFrom(this.delete<FormEncabezadoByIdResponse>(`${this.endpoints.formularioEncabezado}/${id}`));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Éxito');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.error("Error en deleteFormEncabezado:", error);
      this.toastr.error(error?.error?.message || '', 'Error al eliminar encabezado');
      return null;
    }
  }

  // --- SECCIONES ---

  async getSecciones({ page = 1, limit = 10, search = '', encabezadoId = '', all = false } = {}) {
    try {
      const params: any = { page, limit, search, all };
      if (encabezadoId) params['encabezadoId'] = encabezadoId;
      const resp = await firstValueFrom(this.get<FormSeccionResponse>(this.endpoints.formularioSeccion, params));
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      console.error("Error en getSecciones:", error);
      this.toastr.error(error?.error?.message || '', 'Error al obtener secciones');
      return null;
    }
  }

  async getSeccionById(id: string) {
    try {
      const resp = await firstValueFrom(this.get<FormSeccionByIdResponse>(`${this.endpoints.formularioSeccion}/${id}`));
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      console.error("Error en getSeccionById:", error);
      this.toastr.error(error?.error?.message || '', 'Error al obtener sección');
      return null;
    }
  }

  async createSeccion(data: FormSeccion) {
    try {
      const payload = {
        encabezadoId: data.encabezadoId,
        nombre:       data.nombre,
        titulo:       data.titulo,
        subtitulo:    data.subtitulo,
        orden:        data.orden,
        activo:       data.activo,
      };
      const resp = await firstValueFrom(this.post<FormSeccionByIdResponse>(this.endpoints.formularioSeccion, payload));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Éxito');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.error("Error en createSeccion:", error);
      this.toastr.error(error?.error?.message || '', 'Error al crear sección');
      return null;
    }
  }

  async updateSeccion(data: FormSeccion) {
    try {
      if (!data.seccionId) throw new Error("ID de sección no proporcionado");
      const payload = {
        seccionId:  data.seccionId,
        nombre:     data.nombre,
        titulo:     data.titulo,
        subtitulo:  data.subtitulo,
        orden:      data.orden,
        activo:     data.activo,
      };
      const resp = await firstValueFrom(this.put<FormSeccionByIdResponse>(`${this.endpoints.formularioSeccion}/${data.seccionId}`, payload));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Éxito');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.error("Error en updateSeccion:", error);
      this.toastr.error(error?.error?.message || '', 'Error al actualizar sección');
      return null;
    }
  }

  async deleteSeccion(id: string) {
    try {
      const resp = await firstValueFrom(this.delete<FormSeccionByIdResponse>(`${this.endpoints.formularioSeccion}/${id}`));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Éxito');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.error("Error en deleteSeccion:", error);
      this.toastr.error(error?.error?.message || '', 'Error al eliminar sección');
      return null;
    }
  }

  // --- PREGUNTAS ---

  async getPreguntas({ page = 1, limit = 10, search = '', seccionId = '', all = false } = {}) {
    try {
      const params: any = { page, limit, search, all };
      if (seccionId) params['seccionId'] = seccionId;
      const resp = await firstValueFrom(this.get<FormPreguntaResponse>(this.endpoints.formularioPregunta, params));
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      console.error("Error en getPreguntas:", error);
      this.toastr.error(error?.error?.message || '', 'Error al obtener preguntas');
      return null;
    }
  }

  async getPreguntaById(id: string) {
    try {
      const resp = await firstValueFrom(this.get<FormPreguntaByIdResponse>(`${this.endpoints.formularioPregunta}/${id}`));
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      console.error("Error en getPreguntaById:", error);
      this.toastr.error(error?.error?.message || '', 'Error al obtener pregunta');
      return null;
    }
  }

  async createPregunta(data: FormPregunta) {
    try {
      const payload = {
        seccionId:         data.seccionId,
        titulo:            data.titulo,
        subtitulo:         data.subtitulo,
        tipo:              data.tipo,
        valorDefecto:      data.valorDefecto,
        opciones:          data.opciones,
        placeholder:       data.placeholder,
        patronValidacion:  data.patronValidacion,
        mensajeError:      data.mensajeError,
        orden:             data.orden,
        visible:           data.visible,
        obligatorio:       data.obligatorio,
        activo:            data.activo,
      };
      const resp = await firstValueFrom(this.post<FormPreguntaByIdResponse>(this.endpoints.formularioPregunta, payload));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Éxito');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.error("Error en createPregunta:", error);
      this.toastr.error(error?.error?.message || '', 'Error al crear pregunta');
      return null;
    }
  }

  async updatePregunta(data: FormPregunta) {
    try {
      if (!data.preguntaId) throw new Error("ID de pregunta no proporcionado");
      const payload = {
        preguntaId:        data.preguntaId,
        titulo:            data.titulo,
        subtitulo:         data.subtitulo,
        tipo:              data.tipo,
        valorDefecto:      data.valorDefecto,
        opciones:          data.opciones,
        placeholder:       data.placeholder,
        patronValidacion:  data.patronValidacion,
        mensajeError:      data.mensajeError,
        orden:             data.orden,
        visible:           data.visible,
        obligatorio:       data.obligatorio,
        activo:            data.activo,
      };
      const resp = await firstValueFrom(this.put<FormPreguntaByIdResponse>(`${this.endpoints.formularioPregunta}/${data.preguntaId}`, payload));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Éxito');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.error("Error en updatePregunta:", error);
      this.toastr.error(error?.error?.message || '', 'Error al actualizar pregunta');
      return null;
    }
  }

  async deletePregunta(id: string) {
    try {
      const resp = await firstValueFrom(this.delete<FormPreguntaByIdResponse>(`${this.endpoints.formularioPregunta}/${id}`));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Éxito');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.error("Error en deletePregunta:", error);
      this.toastr.error(error?.error?.message || '', 'Error al eliminar pregunta');
      return null;
    }
  }
}
