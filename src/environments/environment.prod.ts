const API_URL = 'https://api.serviciosfundea.org/'

const AGENTE = {
    endpoint: 'https://flujoslocales.fundea.org.gt/webhook/file/v1/analisis',
    apiKey: '1234567890'
}

export const environment = {
    production: true,
    path: API_URL,
    apiPath: (API_URL) + 'v1',
    tokenCheckInterval: 5,  // minutos
    agente: AGENTE
};