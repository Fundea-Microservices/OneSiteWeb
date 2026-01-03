export interface IEmpresaRepresentante {
  empresaId: string;           // uniqueidentifier (PK)
  representanteId: string;     // uniqueidentifier (FK)
  nombreEmpresa: string;       // varchar(150)
  nit: string;                 // varchar(20)
  telefono?: string;           // varchar(15) - Nullable
  departamento: number;        // integer
  municipio: number;           // integer
  direccion: string;           // varchar(300)
  tipoActividad: string;       // uniqueidentifier
  actividad: string;           // uniqueidentifier
  detalleActividad?: string;   // varchar(300) - Nullable
  fechaInicioActividad?: string; // date - Nullable
  usrIngreso?: string;         // varchar(30) - Nullable
  
  // Auditoría
  created_at?: Date;            // datetime (tiene default)
  updated_at?: Date;            // datetime - Nullable
  deleted_at?: Date;            // datetime - Nullable

  // Opcional: Si en el futuro haces un join con TypeORM (relations: ['representante'])
  // representante?: Representante; 
}