import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, inject, ViewChild } from '@angular/core';
import { AuthService } from '../../../../services/auth.service';
import { DatePipe } from '@angular/common';
import { ChangePasswordComponent } from "../../components/user/change-password/change-password.component";
import { Modal } from 'bootstrap';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user-page',
  imports: [DatePipe, ChangePasswordComponent],
  templateUrl: './user-page.html',
  styleUrl: './user-page.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class UserPageComponent {
  public authService = inject(AuthService);

  public user = this.authService.getUserStorage();

  public router = inject(Router);

  @ViewChild('changePasswordModal') modalElementRef!: ElementRef;
  private modalChangePasswordInstance!: bootstrap.Modal;

  ngAfterViewInit() {
    this.modalChangePasswordInstance = new Modal(this.modalElementRef.nativeElement);
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

  closeModal() {
    if (this.modalChangePasswordInstance) {
      this.modalChangePasswordInstance.hide();
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }



}

