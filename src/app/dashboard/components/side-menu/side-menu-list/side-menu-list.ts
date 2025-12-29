import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, inject, signal, ChangeDetectorRef } from '@angular/core';
import { AuthService } from '../../../../../services/auth.service';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { SideMenuListItemComponent } from '../side-menu-list-item/side-menu-list-item';
import { AccesoService } from '../../../../../services/acceso.service';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { CatalogosBantotalService } from '../../../../../services/api-bantotal/catalogos.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-side-menu-list',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './side-menu-list.html',
  styleUrl: './side-menu-list.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('expandCollapse', [
      state('collapsed', style({ height: '0px', opacity: 0, overflow: 'hidden' })),
      state('expanded', style({ height: '*', opacity: 1, overflow: 'hidden' })),
      transition('collapsed <=> expanded', animate('200ms ease')),
    ]),
  ],
})
export class SideMenuListComponent { 

  public authService = inject(AuthService);
  public accesoService = inject(AccesoService);
  public catalogosService = inject(CatalogosBantotalService);
  private cdr = inject(ChangeDetectorRef);
  private toastr = inject(ToastrService);
  
  public router = inject(Router)

  public accesos: any[] = [];

  // Control de menús abiertos por id
  private openSet = new Set<string>();

  ngOnInit(): void {
    this.accesos = this.accesoService.getAccesosStorage() || [];
    
  }

  isOpen(id: string): boolean {
    return this.openSet.has(id);
  }

  toggle(id: string): void {
    if (this.openSet.has(id)) {
      this.openSet.delete(id);
    } else {
      this.openSet.add(id);
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/fundea/login']);
  }

  async actualizarCatalogos() {
    try {
      await this.catalogosService.actualizarCatalogos();
      
      console.log('✅ Catálogos actualizados exitosamente desde el menú');
      this.toastr.success('Catálogos actualizados correctamente', '¡Éxito!');
      
    } catch (error: any) {
      console.error('❌ Error al actualizar catálogos:', error);
      
      const errorMsg = error?.message || 'No se pudieron actualizar los catálogos';
      this.toastr.error(errorMsg, 'Error');
    }
  }

}
