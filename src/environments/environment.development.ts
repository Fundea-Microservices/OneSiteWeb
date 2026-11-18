//const API_URL = 'https://api.serviciosfundea.org/'
const API_URL = 'http://localhost:3000/' //'http://172.25.5.11:3000/'

const AGENTE = {
    endpoint: 'http://190.100.200.84:5678/webhook/file/v1/analisis',
    apiKey: '1234567890'
}

export const environment = {
    production: false,
    path: API_URL,
    apiPath: (API_URL) + 'v1', //"dev" en localhost
    tokenCheckInterval: 5, // minutos
    agente: AGENTE
}; 