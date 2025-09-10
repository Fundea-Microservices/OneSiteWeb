import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AuthService } from '../../../../../services/auth.service';
import { RouterLink } from '@angular/router';
import { FotoPerfilService } from '../../../../../services/usuarios/foto-usuario.service';
import { ChangeDetectorRef } from '@angular/core';

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
  conFoto = signal(false)

  // esto es un signal reactivo
  public user = this.authService.user;

  constructor() {
    this.actualizarFoto();
  }

  async actualizarFoto() {
    if (!this.user()?.userId) return;

    const nuevaFotoUrl = await this.fotoPerfilService.descargarFotoUsuario(this.user().userId);
    if (nuevaFotoUrl) {
      this.conFoto.set(true);
      const updatedUser = { ...this.user()!, photoUrl: nuevaFotoUrl };
      this.authService.updateUser(updatedUser); // 🔑 sincroniza signal
      this.cdr.detectChanges();
    }
  }

}
