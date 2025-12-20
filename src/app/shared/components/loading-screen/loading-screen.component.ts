import { Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-screen',
  standalone: true,
  template: `
    <div class="loading-overlay">
      <div class="loading-container">
        <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
          <span class="visually-hidden">Cargando...</span>
        </div>
        <p class="loading-text mt-3">{{ message() }}</p>
        @if (subtitle()) {
          <p class="loading-subtitle">{{ subtitle() }}</p>
        }
      </div>
    </div>
  `,
  styles: [`
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: rgba(0, 0, 0, 0.6);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      backdrop-filter: blur(3px);
    }

    .loading-container {
      background: white;
      padding: 3rem 4rem;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      text-align: center;
      min-width: 300px;
      animation: fadeIn 0.3s ease-in;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: scale(0.9);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    .loading-text {
      font-size: 1.25rem;
      font-weight: 600;
      color: #333;
      margin-bottom: 0;
    }

    .loading-subtitle {
      font-size: 0.9rem;
      color: #666;
      margin-top: 0.5rem;
      margin-bottom: 0;
    }

    .spinner-border {
      border-width: 0.3rem;
    }
  `]
})
export class LoadingScreenComponent {
  message = input<string>('Cargando...');
  subtitle = input<string>('');
}
