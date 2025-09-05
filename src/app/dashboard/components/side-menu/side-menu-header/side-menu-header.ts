import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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

  public user = this.authService.getUserStorage();

  async actualizarFoto() {
    if (!this.user?.userId) return;

    const nuevaFotoUrl = await this.fotoPerfilService.descargarFotoUsuario(this.user.userId);
    if (nuevaFotoUrl) {
      // Actualizamos la URL de la imagen en el objeto del usuario
      this.user.photoUrl = nuevaFotoUrl;

    }
  }

 }
