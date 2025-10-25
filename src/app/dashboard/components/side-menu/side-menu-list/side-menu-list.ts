import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, inject } from '@angular/core';
import { AuthService } from '../../../../../services/auth.service';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { SideMenuListItemComponent } from '../side-menu-list-item/side-menu-list-item';
import { AccesoService } from '../../../../../services/acceso.service';
import { trigger, state, style, transition, animate } from '@angular/animations';

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

}
