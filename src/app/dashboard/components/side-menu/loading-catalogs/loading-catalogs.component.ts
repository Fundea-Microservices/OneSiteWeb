import { Component, inject, signal, effect } from '@angular/core';
import { CatalogosBantotalService } from '../../../../../services/api-bantotal/catalogos.service';
import { LoadingScreenComponent } from '../../../../shared/components/loading-screen/loading-screen.component';

@Component({
  selector: 'app-loading-catalogs',
  standalone: true,
  imports: [LoadingScreenComponent],
  template: `
    @if (isLoading()) {
      <app-loading-screen 
        [message]="loadingMessage()" 
        [subtitle]="loadingSubtitle()">
      </app-loading-screen>
    }
  `
})
export class LoadingCatalogsComponent {
  private catalogosService = inject(CatalogosBantotalService);
  
  isLoading = signal(false);
  loadingMessage = signal('Actualizando catálogos...');
  loadingSubtitle = signal('Esto puede tomar unos segundos');

  constructor() {
    // Suscribirse al estado de actualización de catálogos
    effect(() => {
      const estado = this.catalogosService.actualizandoCatalogos();
      this.isLoading.set(estado);
    });
  }
}
