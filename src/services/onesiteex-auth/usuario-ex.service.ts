import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { HttpService } from '../HttpService';
import {
  AuthExListResponse,
  AuthExSingleResponse,
  ICargaMasivaResultado,
  IDispositivoEx,
  IDispositivoExFilters,
  ISesionEx,
  ISesionExFilters,
  IUsuarioEx,
  IUsuarioExFilters,
  IUsuarioExUpsert,
} from '../../interfaces/onesiteex-auth/onesiteex-auth';

@Injectable({ providedIn: 'root' })
export class UsuarioExService extends HttpService {
  private readonly base = '/onesiteex/auth/usuario';

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
  }

  async getUsuarios({ page = 1, limit = 10, search = '', idEmpresa, idRol, estado, all }: IUsuarioExFilters = {}) {
    try {
      const params: any = all ? { all: true } : { page, limit };
      if (search) params['search'] = search;
      if (idEmpresa) params['idEmpresa'] = idEmpresa;
      if (idRol) params['idRol'] = idRol;
      if (estado !== undefined) params['estado'] = estado;
      const resp = await firstValueFrom(this.get<AuthExListResponse<IUsuarioEx>>(this.base, params));
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al obtener usuarios');
      return null;
    }
  }

  async getUsuarioById(id: number) {
    try {
      const resp = await firstValueFrom(this.get<AuthExSingleResponse<IUsuarioEx>>(`${this.base}/${id}`));
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al obtener usuario');
      return null;
    }
  }

  async createUsuario(usuario: IUsuarioExUpsert) {
    try {
      const body: any = {
        username: usuario.username,
        password: usuario.password,
        nombreCompleto: usuario.nombreCompleto,
        idEmpresa: Number(usuario.idEmpresa),
        idRol: Number(usuario.idRol),
      };
      if (usuario.estado !== undefined) body['estado'] = usuario.estado;
      if (usuario.tipoCarga) body['tipoCarga'] = usuario.tipoCarga;
      const resp = await firstValueFrom(this.post<AuthExSingleResponse<IUsuarioEx>>(this.base, body));
      if (resp.body?.success) { this.toastr.success(resp.body.message || 'Usuario creado', 'Éxito'); return resp.body; }
      return null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al crear usuario');
      return null;
    }
  }

  /**
   * El idUsuario va en el body, no en la URL.
   * El backend usa forbidNonWhitelisted: se arma el payload solo con campos editables.
   */
  async updateUsuario(usuario: IUsuarioExUpsert) {
    try {
      const body: any = { idUsuario: Number(usuario.idUsuario) };
      if (usuario.username) body['username'] = usuario.username;
      if (usuario.password) body['password'] = usuario.password;
      if (usuario.nombreCompleto) body['nombreCompleto'] = usuario.nombreCompleto;
      if (usuario.idEmpresa != null) body['idEmpresa'] = Number(usuario.idEmpresa);
      if (usuario.idRol != null) body['idRol'] = Number(usuario.idRol);
      if (usuario.estado !== undefined) body['estado'] = usuario.estado;
      if (usuario.tipoCarga) body['tipoCarga'] = usuario.tipoCarga;
      const resp = await firstValueFrom(this.put<AuthExSingleResponse<IUsuarioEx>>(this.base, body));
      if (resp.body?.success) { this.toastr.success(resp.body.message || 'Usuario actualizado', 'Éxito'); return resp.body; }
      return null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al actualizar usuario');
      return null;
    }
  }

  /** Carga masiva desde Excel (.xlsx/.xls, máx 4 MB). El campo del form-data debe llamarse "archivo". */
  async cargaMasivaUsuarios(archivo: File) {
    try {
      const formData = new FormData();
      formData.append('archivo', archivo, archivo.name);
      const resp = await firstValueFrom(
        this.postFormData<AuthExSingleResponse<ICargaMasivaResultado>>(`${this.base}/carga-masiva`, formData)
      );
      if (resp.body?.success) {
        const r = resp.body.data;
        if (r?.cantidadErrores) this.toastr.warning(resp.body.message || '', 'Carga con errores');
        else this.toastr.success(resp.body.message || 'Carga finalizada', 'Éxito');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error en la carga masiva');
      return null;
    }
  }

  /** Baja lógica: deja estado = false, no borra el registro. */
  async deleteUsuario(id: number) {
    try {
      const resp = await firstValueFrom(
        this.delete<AuthExSingleResponse<{ idUsuario: number }>>(`${this.base}/${id}`)
      );
      if (resp.body?.success) { this.toastr.success(resp.body.message || 'Usuario dado de baja', 'Éxito'); return resp.body; }
      return null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al dar de baja al usuario');
      return null;
    }
  }

  /** Dispositivos donde el usuario ha abierto sesión (no asignados). Sin logins devuelve []. */
  async getDispositivosByUsuario(idUsuario: number, { page = 1, limit = 10, search = '', estado, all }: IDispositivoExFilters = {}) {
    try {
      const params: any = all ? { all: true } : { page, limit };
      if (search) params['search'] = search;
      if (estado !== undefined) params['estado'] = estado;
      const resp = await firstValueFrom(
        this.get<AuthExListResponse<IDispositivoEx>>(`${this.base}/${idUsuario}/dispositivo`, params)
      );
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al obtener dispositivos');
      return null;
    }
  }

  /** activa y vigente son independientes: una sesión activa puede estar vencida. */
  async getSesionesByUsuario(idUsuario: number, { page = 1, limit = 10, idDispositivo, activa, vigente, all }: ISesionExFilters = {}) {
    try {
      const params: any = all ? { all: true } : { page, limit };
      if (idDispositivo) params['idDispositivo'] = idDispositivo;
      if (activa !== undefined) params['activa'] = activa;
      if (vigente !== undefined) params['vigente'] = vigente;
      const resp = await firstValueFrom(
        this.get<AuthExListResponse<ISesionEx>>(`${this.base}/${idUsuario}/sesion`, params)
      );
      return resp.body?.success ? resp.body : null;
    } catch (error: any) {
      this.toastr.error(error?.error?.message || '', 'Error al obtener sesiones');
      return null;
    }
  }
}
