//const API_URL = 'http://localhost:3000/'

const API_URL = 'http://172.25.5.11:3000/'

const AGENTE = {
    endpoint: 'https://b4a8c899f08a.ngrok-free.app/webhook/file/v1/analisis',
    apiKey: '1234567890'
}

export const environment = {
    production: true,
    path: API_URL,
    apiPath: (API_URL) + 'api',
    tokenCheckInterval: 5,  // minutos
    agente: AGENTE
};