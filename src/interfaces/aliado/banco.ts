/* =========================================================
   INTERFAZ BANCO
   ========================================================= */
export interface IBancoRepresentante {
  bancoId: string;           // uniqueidentifier (PK)
  nombreBanco: string;       // varchar(150)
  nombreAbreviado: string;   // varchar(10)
  descripcion?: string;      // varchar(150) - Nullable
}

/* =========================================================
   INTERFAZ TIPO DE CUENTA
   ========================================================= */
export interface ITipoCuentaRepresentante {
  tipoCuentaId: string;      // uniqueidentifier (PK)
  nombre: string;            // varchar(50)
  descripcion?: string;      // varchar(150) - Nullable
}

/* =========================================================
   INTERFAZ CUENTA BANCARIA
   ========================================================= */
export interface ICuentaBancariaRepresentante {
  cuentaBancariaId: string;  // uniqueidentifier (PK)
  empresaId: string;         // uniqueidentifier (FK)
  bancoId: string;           // uniqueidentifier (FK)
  tipoCuentaId: string;      // uniqueidentifier (FK)
  monedaId: number;          // integer
  numeroCuenta: string;      // varchar(30)
  nombreCuenta: string;      // varchar(150)
  activo?: boolean;          // bit (Default 1) - Nullable en input
  usrIngreso?: string;       // varchar(30) - Nullable

  // Auditoría
  created_at?: Date;          // datetime
  updated_at?: Date;          // datetime - Nullable
  deleted_at?: Date;          // datetime - Nullable
}