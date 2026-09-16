const API_URL = 'https://api.serviciosfundea.org/'

const AGENTE = {
    endpoint: 'http://190.100.200.84:5678/webhook/file/v1/analisis',
    apiKey: '1234567890'
}

export const environment = {
    production: false,
    path: API_URL,
    apiPath: (API_URL) + 'v1',
    tokenCheckInterval: 5, // minutos
    agente: AGENTE
};