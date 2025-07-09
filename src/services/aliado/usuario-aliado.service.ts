import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpService } from '../HttpService';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { IUsuarioAliado, UsuarioAliadoResponse } from '../../interfaces/aliado/usuario-aliado';

@Injectable({
  providedIn: 'root'
})
export class UsuarioAliadoService extends HttpService {

  private readonly endpoints = {
    usuario: '/aliado/usuario',
  };

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http); // pasa HttpClient al servicio base
  }

  async getUsuarios({ page = 1, limit = 10, search = '', all = false } = {}) {
    try {
      let params: any = {
        page,
        limit,
        search
      }
      if (all) {
        params = {...params, all: all};
      }
      const resp =  await firstValueFrom(this.get<UsuarioAliadoResponse>(`${this.endpoints.usuario}`, params));
      if (resp.body?.success) {
        // this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ UsuarioAliadoService ~ getUsuarios ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en usuarios');
      return null;
    }
  }

  async updateUsuario(usuarioUpdate: IUsuarioAliado) {
    try {
      //Obtenemos solo lo necesario para actualizar el usuario
      const { empresa, password, ...usuarioUpdated } = usuarioUpdate;
      const resp =  await firstValueFrom(this.put<UsuarioAliadoResponse>(`${this.endpoints.usuario}`, usuarioUpdated));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ UsuarioAliadoService ~ updateUsuario ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en usuarios');
      return null;
    }
  }

  async createUsuario(createUsuario: IUsuarioAliado) {
    try {
      //Obtenemos solo lo necesario para crear el usuario
      const { fullName, userName, password, email, active, empresaId } = createUsuario;
      const resp =  await firstValueFrom(this.post<UsuarioAliadoResponse>(`${this.endpoints.usuario}`, { fullName, userName, password, email, active, empresaId }));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ UsuarioAliadoService ~ createUsuario ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en usuarios');
      return null;
    }
  }

  async deleteUsuario(usuarioDelete: IUsuarioAliado) {
    try {
      //Obtenemos solo lo necesario para actualizar el usuario
      const { empresa, password, ...usuarioDeleted } = usuarioDelete;
      const resp =  await firstValueFrom(this.delete<UsuarioAliadoResponse>(`${this.endpoints.usuario}`, usuarioDeleted));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ UsuarioAliadoService ~ deleteUsuario ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en usuarios');
      return null;
    }
  }
}
