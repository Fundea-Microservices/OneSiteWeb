import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { HttpService } from '../HttpService';
import {
  Carousel,
  CarouselListResponse,
  CarouselResponse,
  CreateCarouselDto,
  UpdateCarouselDto,
} from '../../interfaces/carousel';

@Injectable({
  providedIn: 'root',
})
export class CarouselService extends HttpService {

  private readonly endpoints = {
    carousel: '/config/carousel',
  };

  constructor(http: HttpClient, private toastr: ToastrService) {
    super(http);
  }

  async getCarouseles({ page = 1, limit = 10, search = '', all = false } = {}) {
    try {
      let params: any = { page, limit, search };
      if (all) {
        params = { ...params, all };
      }
      const resp = await firstValueFrom(
        this.get<CarouselListResponse>(`${this.endpoints.carousel}`, params)
      );
      if (resp.body?.success) {
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.log('🚀 ~ CarouselService ~ getCarouseles ~ error:', error);
      this.toastr.error(error?.error?.message || '', 'Error en carousel');
      return null;
    }
  }

  async getCarouselById(carouselId: string) {
    try {
      const resp = await firstValueFrom(
        this.get<CarouselResponse>(`${this.endpoints.carousel}/by-id/${carouselId}`)
      );
      if (resp.body?.success) {
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.log('🚀 ~ CarouselService ~ getCarouselById ~ error:', error);
      this.toastr.error(error?.error?.message || '', 'Error en carousel');
      return null;
    }
  }

  async createCarousel(payload: CreateCarouselDto) {
    try {
      const resp = await firstValueFrom(
        this.post<CarouselResponse>(`${this.endpoints.carousel}`, payload)
      );
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.log('🚀 ~ CarouselService ~ createCarousel ~ error:', error);
      this.toastr.error(error?.error?.message || '', 'Error al crear carousel');
      return null;
    }
  }

  async updateCarousel(payload: UpdateCarouselDto) {
    try {
      const resp = await firstValueFrom(
        this.put<CarouselResponse>(
          `${this.endpoints.carousel}/${payload.carouselId}`,
          payload
        )
      );
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.log('🚀 ~ CarouselService ~ updateCarousel ~ error:', error);
      this.toastr.error(error?.error?.message || '', 'Error al actualizar carousel');
      return null;
    }
  }

  async deleteCarousel(carousel: Pick<Carousel, 'carouselId'>) {
    try {
      const resp = await firstValueFrom(
        this.delete<CarouselResponse>(`${this.endpoints.carousel}`, carousel)
      );
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.log('🚀 ~ CarouselService ~ deleteCarousel ~ error:', error);
      this.toastr.error(error?.error?.message || '', 'Error al eliminar carousel');
      return null;
    }
  }

  async subirFotoCarousel(carouselId: string, file: File) {
    try {
      const formData = new FormData();
      formData.append('foto', file);
      formData.append('carouselId', carouselId);
      const resp = await firstValueFrom(
        this.postFormData<CarouselResponse>(`${this.endpoints.carousel}/foto`, formData)
      );
      if (resp.body?.success) {
        this.toastr.success(resp.body.message, 'Success');
        return resp.body;
      }
      return null;
    } catch (error: any) {
      console.log('🚀 ~ CarouselService ~ subirFotoCarousel ~ error:', error);
      this.toastr.error(error?.error?.message || '', 'Error al subir foto del carousel');
      return null;
    }
  }
}
