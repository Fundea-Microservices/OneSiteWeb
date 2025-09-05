import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { HttpService } from '../HttpService';
import { IUser, UsersResponse } from '../../interfaces/auth';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class UserService extends HttpService {

  private readonly endpoints = {
    user: '/config/user',
  };

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http); // pasa HttpClient al servicio base
  }

  async getUsers({ page = 1, limit = 10, search = '', rolId = '', metodoId = '' } = {}) {
    try {
      let params: any = {
        page,
        limit,
        search
      }
      if (rolId) {
        params = {...params, rolId: rolId};
      }
      if (metodoId) {
        params = {...params, metodoId: metodoId};
      }
      const resp =  await firstValueFrom(this.get<UsersResponse>(`${this.endpoints.user}`, params));
      if (resp.body?.success) {
        // this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ UserService ~ getUsers ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en usuarios');
      return null;
    }
  }

  async updateUser(userUpdate: IUser) {
    try {
      // Retiramos el password, el rol, puesto y metodo
      const { password, rol, puesto, metodo, created_at, updated_at, deleted_at, lastPasswordUpdate, ...userData } = userUpdate;
      const resp =  await firstValueFrom(this.put<UsersResponse>(`${this.endpoints.user}`, userData));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ UserService ~ updateUser ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en usuarios');
      return null;
    }
  }

  async createUser(createUser: IUser) {
    try {
      //Retiramos el id
      const { userId, lastPasswordUpdate, created_at, rol, puesto, metodoId, ...other } = createUser;
      let userData: any = {
        ...other
      }
      if (metodoId && metodoId !== '') {
        userData.metodoId = metodoId;
      }

      const resp =  await firstValueFrom(this.post<UsersResponse>(`${this.endpoints.user}`, userData));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;
    } catch (error: any) {
      console.log("🚀 ~ UserService ~ createUser ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en usuarios');
      return null;
    }
  }

  async deleteUser(userDelete: IUser) {
    try {
      const resp =  await firstValueFrom(this.delete<UsersResponse>(`${this.endpoints.user}`, {userId: userDelete.userId, email: userDelete.email, userName: userDelete.userName, name1: userDelete.name1, lastName1: userDelete.lastName1}));
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }

      return null;

    } catch (error: any) {
      console.log("🚀 ~ UserService ~ deleteUser ~ error:", error)
      this.toastr.error(error?.error?.message || '', 'Error en usuarios');
      return null;
    }
  }
}
