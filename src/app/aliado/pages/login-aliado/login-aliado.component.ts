import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login-aliado',
  imports: [RouterLink],
  templateUrl: './login-aliado.component.html',
  styleUrls: ['./login-aliado.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class LoginAliadoComponent { 
  
  public router = inject(Router)

  userName = signal('');
  password = signal('');

  login() {
    console.log('Logging in with', this.userName(), this.password());
    // Redireccionamos a aliado/home
    this.router.navigate(['/aliado/home']);
  }

}
