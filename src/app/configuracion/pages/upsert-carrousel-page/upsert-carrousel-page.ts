import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { CarouselService } from '../../../../services/config/carousel.service';
import { Carousel, CreateCarouselDto, UpdateCarouselDto } from '../../../../interfaces/carousel';
import { UpsertCarrouselComponent } from '../../components/carrousel/upsert-carrousel/upsert-carrousel';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-upsert-carrousel-page',
  imports: [RouterLink, DatePipe, UpsertCarrouselComponent],
  templateUrl: './upsert-carrousel-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class UpsertCarrouselPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private carouselService = inject(CarouselService);
  private cdr = inject(ChangeDetectorRef);

  isLoading = signal(false);
  nuevo = signal(true);
  carouselData = signal<Carousel>(this.emptyCarousel());
  preview = signal<Partial<Carousel>>({});
  pendingFile = signal<File | null>(null);

  private emptyCarousel(): Carousel {
    return {
      carouselId: '',
      titulo: '',
      fotoUrl: '',
      orden: 1,
      visibleApp: true,
      esExterno: false,
      activo: true,
      created_at: new Date(),
    };
  }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.nuevo.set(false);
      await this.loadCarousel(id);
    }
  }

  async loadCarousel(id: string) {
    this.isLoading.set(true);
    const resp = await this.carouselService.getCarouselById(id);
    if (resp?.data) {
      this.carouselData.set(resp.data);
      this.preview.set(resp.data);
    }
    this.isLoading.set(false);
    this.cdr.markForCheck();
  }

  onLiveChange(values: Partial<Carousel>) {
    this.preview.set(values);
    this.cdr.markForCheck();
  }

  onPhotoFile(file: File | null) {
    this.pendingFile.set(file);
  }

  async onSave(payload: CreateCarouselDto | UpdateCarouselDto) {
    try {
      const resp = this.nuevo()
        ? await this.carouselService.createCarousel(payload as CreateCarouselDto)
        : await this.carouselService.updateCarousel(payload as UpdateCarouselDto);

      if (resp?.success) {
        const file = this.pendingFile();
        if (file) {
          await this.carouselService.subirFotoCarousel(resp.data.carouselId, file);
        }
        this.router.navigate(['/config/carrousel']);
      }
    } catch (error) {
      console.error('Error en onSave carousel:', error);
    }
  }

  onCancel() {
    this.router.navigate(['/config/carrousel']);
  }

  resolverFoto(fotoUrl: string | undefined): string {
    if (!fotoUrl || fotoUrl.startsWith('http')) return fotoUrl ?? '';
    return `${environment.apiPath}/config/carousel/imagen?fotoUrl=${encodeURIComponent(fotoUrl)}`;
  }
}
