export interface Carousel {
  carouselId: string;
  titulo: string;
  subtitulo?: string;
  descripcion?: string;
  fotoUrl: string;
  redireccionUrl?: string;
  
  // Campos de visualización y control
  orden: number;
  visibleApp: boolean;
  textoBoton?: string;
  esExterno: boolean;
  
  // Programación de vigencia
  fechaInicio?: Date | string;
  fechaFin?: Date | string;
  
  // Campos de auditoría y estado
  activo: boolean;
  created_at: Date | string;
  updated_at?: Date | string;
  deleted_at?: Date | string;
}

export interface CarouselListResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: Carousel[];
  metadata: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface CarouselResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: Carousel;
}

export type CreateCarouselDto = Omit<Carousel, 'carouselId' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type UpdateCarouselDto = Partial<CreateCarouselDto> & { carouselId: string };