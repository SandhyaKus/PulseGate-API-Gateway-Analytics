import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
const UPSTREAM_URL = import.meta.env.VITE_UPSTREAM_URL || 'http://localhost:4001';

// Gateway API client
export const gatewayApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Upstream direct client for testing
export const upstreamApi = axios.create({
  baseURL: UPSTREAM_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default gatewayApi;

