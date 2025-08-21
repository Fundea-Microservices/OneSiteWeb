export interface PlantillaResponse {
    success:    boolean;
    statusCode: number;
    message:    string;
    data?:   {
        reporteId: string,
        nombre: string,
        rutaArchivo: string
    }
}