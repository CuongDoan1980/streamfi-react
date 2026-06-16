import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PrivyProvider } from '@privy-io/react-auth'
import './index.css'
import App from './App.jsx'

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID || 'cmq7mwd29006q0ckvxsk5odjs'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#7C3AED',
          logo: undefined,
        },
        loginMethods: ['google', 'twitter', 'discord', 'tiktok', 'email', 'wallet'],
        embeddedWallets: {
          ethereum: { createOnLogin: 'users-without-wallets' },
        },
        defaultChain: {
          id: 84532,
          name: 'Base Sepolia',
          network: 'base-sepolia',
          nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
          rpcUrls: { default: { http: ['https://sepolia.base.org'] } },
        },
        supportedChains: [
          {
            id: 84532,
            name: 'Base Sepolia',
            network: 'base-sepolia',
            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: { default: { http: ['https://sepolia.base.org'] } },
          },
        ],
      }}
    >
      <App />
    </PrivyProvider>
  </StrictMode>,
)
