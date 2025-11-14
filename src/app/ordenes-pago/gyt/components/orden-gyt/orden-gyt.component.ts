import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Cliente {
  nombres: string;
  apellidos: string;
  tipoIdentificacion: string;
  numeroIdentificacion: string;
  telefono: string;
  correo: string;
  montoPrestamo: number;
  numeroOperacion: string;
}

interface OrdenGytData {
  cliente: Cliente;
  ordenId: string;
  fecha: Date;
  monto: number;
}

@Component({
  selector: 'app-orden-gyt',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './orden-gyt.component.html',
  styleUrls: ['./orden-gyt.component.css']
})
export class OrdenGytComponent {
  @Input() ordenData!: OrdenGytData;
  
  get fechaFormateada(): string {
    return this.ordenData?.fecha?.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) || '';
  }
  
  get horaFormateada(): string {
    return this.ordenData?.fecha?.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    }) || '';
  }
}