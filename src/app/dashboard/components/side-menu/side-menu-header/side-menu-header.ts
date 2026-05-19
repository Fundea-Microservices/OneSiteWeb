import { ChangeDetectionStrategy, ChangeDetectorRef, Component, effect, inject, signal } from '@angular/core';
import { AuthService } from '../../../../../services/auth.service';
import { RouterLink } from '@angular/router';
import { FotoPerfilService } from '../../../../../services/usuarios/foto-usuario.service';

@Component({
  selector: 'app-side-menu-header',
  imports: [RouterLink],
  templateUrl: './side-menu-header.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SideMenuHeaderComponent {

  private authService = inject(AuthService);
  private fotoPerfilService = inject(FotoPerfilService);
  private cdr = inject(ChangeDetectorRef);
  conFoto = signal(false);

  public user = this.authService.user;

  constructor() {
    // Reacciona a cada cambio de user().photoUrl:
    // - URL cruda  → descarga el blob (carga inicial)
    // - blob URL   → ya fue procesada (post-subida), fuerza re-render con markForCheck
    effect(() => {
      const photoUrl = this.user().photoUrl;
      if (photoUrl?.startsWith('blob:')) {
        this.conFoto.set(true);
        this.cdr.markForCheck();
      } else if (photoUrl) {
        this.actualizarFoto();
      }
    });
  }

  async actualizarFoto() {
    if (!this.user()?.userId) return;

    const nuevaFotoUrl = await this.fotoPerfilService.descargarFotoUsuario(this.user().photoUrl);
    if (nuevaFotoUrl) {
      this.conFoto.set(true);
      const updatedUser = { ...this.user()!, photoUrl: nuevaFotoUrl };
      this.authService.updateUser(updatedUser);
      this.cdr.detectChanges();
    }
  }

}
