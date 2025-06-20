import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TokenCheckerService } from '../services/token-checker.service';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected title = 'OneSiteWeb';

  // Esto asegura que el servicio se instancie y comience a trabajar
  private tokenChecker = inject(TokenCheckerService);
}
