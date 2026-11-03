import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, inject, signal, ChangeDetectorRef, output, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../../../services/auth.service';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { SideMenuListItemComponent } from '../side-menu-list-item/side-menu-list-item';
import { AccesoService } from '../../../../../services/config/acceso.service';
import { AnimationEvent, trigger, state, style, transition, animate } from '@angular/animations';
import { CatalogosBantotalService } from '../../../../../services/api-bantotal/catalogos.service';
import { ToastrService } from 'ngx-toastr';
import { filter } from 'rxjs';

@Component({
  selector: 'app-side-menu-list',
  imports: [RouterLink],
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
  
  public router = inject(Router);

  // Output para notificar al componente padre que se debe cerrar el menú
  public submenuSelected = output<void>();

  public accesos: any[] = [];

  // Acordeón: solo un grupo abierto a la vez para reducir el desplazamiento vertical
  private openId = signal<string | null>(null);

  // Opción de la pantalla en curso y el grupo al que pertenece
  public activeSubmenuId = signal<string | null>(null);
  public activeParentId = signal<string | null>(null);

  private menuScroll = viewChild.required<ElementRef<HTMLElement>>('menuScroll');

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntilDestroyed(),
    ).subscribe(() => this.syncWithUrl());
  }

  ngOnInit(): void {
    this.accesos = this.accesoService.getAccesosStorage() || [];
    this.syncWithUrl();
  }

  isOpen(id: string): boolean {
    return this.openId() === id;
  }

  toggle(id: string): void {
    this.openId.update(openId => openId === id ? null : id);
  }

  onSubmenuClick(): void {
    // Notificar al componente padre que se seleccionó un submenú
    this.submenuSelected.emit();
  }

  onGroupAnimationDone(event: AnimationEvent, grupo: HTMLElement): void {
    if (event.toState === 'expanded') {
      this.revealGroup(grupo);
    }
  }

  // Marca la opción cuya ruta coincide con la URL y abre su grupo. Gana la ruta más
  // larga para que /flujos/nuevo active "/flujos" y no también "/flujo-fondos".
  private syncWithUrl(): void {
    const url = this.normalizePath(decodeURI(this.router.url));
    let activeLength = 0;
    let activeSubmenuId: string | null = null;
    let activeParentId: string | null = null;

    for (const acceso of this.accesos) {
      if (!this.isVisible(acceso)) continue;

      for (const submenu of acceso.subMenus ?? []) {
        if (!this.isVisible(submenu)) continue;

        const path = submenu.menu.reporteId
          ? `reportes/ejecutar/${submenu.menu.reporteId}`
          : this.normalizePath(submenu.menu.pathWeb ?? '');

        if (path.length > activeLength && (url === path || url.startsWith(`${path}/`))) {
          activeLength = path.length;
          activeSubmenuId = submenu.accesoId;
          activeParentId = acceso.accesoId;
        }
      }
    }

    this.activeSubmenuId.set(activeSubmenuId);
    this.activeParentId.set(activeParentId);
    if (activeParentId) {
      this.openId.set(activeParentId);
    }
  }

  private isVisible(acceso: any): boolean {
    return acceso.showWeb && acceso.menu.active && acceso.active;
  }

  private normalizePath(path: string): string {
    return path.split(/[?#]/)[0].replace(/^\/+|\/+$/g, '');
  }

  // Desplaza lo justo para ver el grupo completo sin que su encabezado salga por arriba
  // y, si el grupo no cabe en pantalla, sin dejar fuera la opción activa.
  private revealGroup(grupo: HTMLElement): void {
    const scroll = this.menuScroll().nativeElement;
    const area = scroll.getBoundingClientRect();
    const rect = grupo.getBoundingClientRect();

    let delta = Math.min(Math.max(0, rect.bottom - area.bottom), rect.top - area.top);

    const activo = grupo.querySelector('.is-active');
    if (activo) {
      delta = Math.max(delta, activo.getBoundingClientRect().bottom - area.bottom);
    }

    scroll.scrollBy({ top: delta });
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
