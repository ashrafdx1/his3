import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';

// Initialize React Query client with premium default configurations (stale times, caching, refetching rules)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Prevents aggressive background refreshes
      retry: 1, // Limit retries on connection failures
      staleTime: 5 * 60 * 1000, // Cache objects for 5 minutes by default
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);const API_URL = import.meta.env.VITE_API_URL;

fetch(`${API_URL}/users`);
app.enableCors({
    origin: "https://his3-2.onrender.com/",
      credentials: true,
      });