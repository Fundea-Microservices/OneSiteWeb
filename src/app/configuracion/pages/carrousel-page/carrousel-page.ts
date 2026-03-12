import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Modal } from 'bootstrap';
import { CarouselService } from '../../../../services/config/carousel.service';
import { Carousel, CreateCarouselDto, UpdateCarouselDto } from '../../../../interfaces/carousel';
import { PaginationAllComponent } from '../../../shared/components/pagination-all/pagination-all';
import { UpsertCarrouselComponent } from '../../components/carrousel/upsert-carrousel/upsert-carrousel';

@Component({
  selector: 'app-carrousel-page',
  imports: [RouterLink, DatePipe, PaginationAllComponent, UpsertCarrouselComponent],
  templateUrl: './carrousel-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class CarrouselPage {
  private carouselService = inject(CarouselService);
  private cdr = inject(ChangeDetectorRef);

  isLoading = signal(false);
  carouselList = signal<Carousel[]>([]);
  pagination = signal<IPagination>({ page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });

  nuevo = signal(true);
  carouselEdit = signal<Carousel>(this.emptyCarousel());
  modal = signal({ titulo: 'Crear Carrusel', visible: false });

  @ViewChild('upsertModal') modalRef!: ElementRef;
  @ViewChild('deleteModal') deleteModalRef!: ElementRef;
  private modalInstance!: Modal;
  private deleteModalInstance!: Modal;

  ngOnInit() {
    this.fetchData();
  }

  ngAfterViewInit() {
    this.modalInstance = new Modal(this.modalRef.nativeElement);
    this.deleteModalInstance = new Modal(this.deleteModalRef.nativeElement);
  }

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

  async fetchData() {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    try {
      const resp = await this.carouselService.getCarouseles({
        page: this.pagination().page,
        limit: this.pagination().pageSize,
      });
      if (resp?.data) {
        this.carouselList.set(resp.data.map(c => ({
          ...c,
          activo: c.activo == true || (c.activo as any) === 1 || (c.activo as any) === '1',
          visibleApp: c.visibleApp == true || (c.visibleApp as any) === 1 || (c.visibleApp as any) === '1',
        })));
        const m = resp.metadata;
        this.pagination.set({
          page: m.page ?? 1,
          pageSize: m.limit ?? 10,
          totalItems: m.total ?? 0,
          totalPages: Math.ceil((m.total ?? 0) / (m.limit ?? 10)),
        });
      } else {
        this.carouselList.set([]);
      }
    } catch (e) {
      console.error('Error fetching carouseles', e);
      this.carouselList.set([]);
    } finally {
      this.isLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  onChangePage(p: IPagination) {
    this.pagination.set(p);
    this.fetchData();
  }

  async toggleVisibleApp(item: Carousel) {
    const resp = await this.carouselService.updateCarousel({
      ...item,
      visibleApp: !item.visibleApp,
    });
    if (resp?.success) this.fetchData();
  }

  async toggleActivo(item: Carousel) {
    const resp = await this.carouselService.updateCarousel({
      ...item,
      activo: !item.activo,
    });
    if (resp?.success) this.fetchData();
  }

  openModal(nuevo: boolean, item: Carousel = this.emptyCarousel()) {
    this.nuevo.set(nuevo);
    this.carouselEdit.set(nuevo ? this.emptyCarousel() : { ...item });
    this.modal.set({ titulo: nuevo ? 'Crear Carrusel' : 'Editar Carrusel', visible: true });
    if (!this.modalInstance) this.modalInstance = new Modal(this.modalRef.nativeElement);
    this.modalInstance.show();
  }

  closeModal() {
    this.modalInstance?.hide();
  }

  openDeleteModal(item: Carousel) {
    this.carouselEdit.set(item);
    if (!this.deleteModalInstance) this.deleteModalInstance = new Modal(this.deleteModalRef.nativeElement);
    this.deleteModalInstance.show();
  }

  async upsertCarousel(payload: CreateCarouselDto | UpdateCarouselDto) {
    try {
      const resp = this.nuevo()
        ? await this.carouselService.createCarousel(payload as CreateCarouselDto)
        : await this.carouselService.updateCarousel(payload as UpdateCarouselDto);

      if (resp?.success) {
        this.closeModal();
        this.carouselEdit.set(this.emptyCarousel());
        this.fetchData();
      }
      // Si resp es null o success es false, el modal permanece abierto
    } catch (error) {
      console.error('Error inesperado en upsertCarousel:', error);
      // El modal permanece abierto ante cualquier error inesperado
    }
  }

  async deleteCarousel() {
    const item = this.carouselEdit();
    if (!item.carouselId) return;
    const resp = await this.carouselService.deleteCarousel({ carouselId: item.carouselId });
    if (resp?.success) {
      this.fetchData();
      this.deleteModalInstance?.hide();
    }
  }
}
