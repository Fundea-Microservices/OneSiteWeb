import { ChangeDetectionStrategy, ChangeDetectorRef, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { AuthService } from '../../../../services/auth.service';
import { DatePipe } from '@angular/common';
import { ChangePasswordComponent } from "../../components/user/change-password/change-password.component";
import { Modal } from 'bootstrap';
import { Router } from '@angular/router';
import { UpsertFotoUsuarioComponent } from '../../components/user/upsert-foto/upsert-foto.component';
import { FotoPerfilService } from '../../../../services/usuarios/foto-usuario.service';

@Component({
  selector: 'app-user-page',
  imports: [DatePipe, ChangePasswordComponent, UpsertFotoUsuarioComponent],
  templateUrl: './user-page.html',
  styleUrl: './user-page.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class UserPageComponent {
  public authService = inject(AuthService);
  private fotoPerfilService = inject(FotoPerfilService);
  private cdr = inject(ChangeDetectorRef);

  public user = this.authService.getUserStorage();

  public router = inject(Router);
  formKey = signal(Date.now());

  @ViewChild('changePasswordModal') modalElementRef!: ElementRef;
  private modalChangePasswordInstance!: bootstrap.Modal;

  @ViewChild('upsertModalFotoUsuario') modalFotoElementRef!: ElementRef;
  private modalUpsertFotoInstance!: bootstrap.Modal;

  constructor() {
    this.actualizarFoto();
  }

  ngAfterViewInit() {
    this.modalChangePasswordInstance = new Modal(this.modalElementRef.nativeElement);
    this.modalUpsertFotoInstance = new Modal(this.modalFotoElementRef.nativeElement);
  }

  async changePassword(current: string, newPassword: string) {
    const data = {
      current: current,
      newPassword: newPassword,
      userId: this.user.userId
    }
    const resp = await this.authService.changePassword(data)

    if (resp?.success) {
      this.closeModal();
    }
  }

  handlePasswordChange($event: { current: string; new: string; }) {
    if ($event.current && $event.new) {
      this.changePassword($event.current, $event.new);
    }

    return null
  }

  openModal() {
    if (!this.modalChangePasswordInstance) {
      this.modalChangePasswordInstance = new Modal(this.modalElementRef.nativeElement);
    }
    this.modalChangePasswordInstance.show();
  }

  openModalFoto() {
    this.formKey.set(Date.now());
    if (!this.modalUpsertFotoInstance) {
      this.modalUpsertFotoInstance = new Modal(this.modalFotoElementRef.nativeElement);
    }
    this.modalUpsertFotoInstance.show();
  }

  closeModal() {
    if (this.modalChangePasswordInstance) {
      this.modalChangePasswordInstance.hide();
    }
    if (this.modalUpsertFotoInstance) {
      this.modalUpsertFotoInstance.hide();
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  async actualizarFoto() {
    if (!this.user?.userId) return;

    const nuevaFotoUrl = await this.fotoPerfilService.descargarFotoUsuario(this.user.userId);
    if (nuevaFotoUrl) {
      // Actualizamos la URL de la imagen en el objeto del usuario
      this.user.photoUrl = nuevaFotoUrl;
      this.cdr.detectChanges(); // forzar renderizado
    }
  }



}

