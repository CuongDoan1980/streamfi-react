import { useEffect, useRef } from 'react';
import {
  usePrivy,
  useLoginWithOAuth,
  useConnectWallet,
  useWallets,
  useExportWallet,
} from '@privy-io/react-auth';
import bodyHtml from './body.html?raw';
// Side-effect import: loads all StreamFi vanilla JS and exposes functions to window
import './legacy.js';

// Icons/avatars per provider, used in the StreamFi UI (legacy.js expects {provider,name,address,avatar})
const ICONS = {
  google: '🇬',
  twitter: '𝕏',
  discord: '⚔',
  tiktok: '♪',
  metamask: '🦊',
  phantom: '👻',
};

function shortAddr(addr) {
  if (!addr) return '';
  return addr.slice(0, 8) + '...' + addr.slice(-4);
}

function displayNameFor(privyUser, provider) {
  // Try to pull a human-friendly name/handle from Privy's linked accounts
  const accounts = privyUser?.linkedAccounts || [];
  if (provider === 'google') {
    const g = accounts.find((a) => a.type === 'google_oauth');
    return g?.email || g?.name || 'Google User';
  }
  if (provider === 'twitter') {
    const t = accounts.find((a) => a.type === 'twitter_oauth');
    return t?.username ? '@' + t.username : '@your_twitter';
  }
  if (provider === 'discord') {
    const d = accounts.find((a) => a.type === 'discord_oauth');
    return d?.username || 'DiscordUser';
  }
  if (provider === 'tiktok') {
    const tk = accounts.find((a) => a.type === 'tiktok_oauth');
    return tk?.username ? '@' + tk.username : '@tiktok_user';
  }
  return privyUser?.id || 'StreamFi User';
}

export default function App() {
  const { ready, authenticated, user: privyUser, logout } = usePrivy();
  const { initOAuth } = useLoginWithOAuth();
  const { connectWallet } = useConnectWallet();
  const { wallets } = useWallets();
  const { exportWallet } = useExportWallet();
  const loggedInOnce = useRef(false);
  const appInitialized = useRef(false);

  // Initialize StreamFi UI after React has mounted the body HTML into the DOM
  useEffect(() => {
    if (appInitialized.current) return;
    appInitialized.current = true;
    if (typeof window.initApp === 'function') {
      window.initApp();
    }
  }, []);

  // ===== Bridge: window.loginWith(provider) called from inline onclick in body.html =====
  useEffect(() => {
    window.loginWith = (provider) => {
      if (typeof window.closeAll === 'function') window.closeAll();
      if (typeof window.showToast === 'function') {
        window.showToast('⏳ Đang kết nối ' + provider + '...');
      }

      if (provider === 'metamask') {
        connectWallet({ walletList: ['metamask'] }).catch((e) => {
          console.error(e);
          if (typeof window.showToast === 'function') {
            window.showToast('❌ Không thể kết nối MetaMask: ' + e.message);
          }
        });
        return;
      }

      if (provider === 'phantom') {
        if (typeof window.showToast === 'function') {
          window.showToast('⚠️ Hỗ trợ ví Phantom (Solana) sẽ sớm ra mắt!');
        }
        return;
      }

      // google / twitter / discord / tiktok -> real Privy OAuth
      initOAuth({ provider }).catch((e) => {
        console.error(e);
        if (typeof window.showToast === 'function') {
          window.showToast('❌ Đăng nhập thất bại: ' + e.message);
        }
      });
    };

    return () => {
      delete window.loginWith;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initOAuth, connectWallet]);

  // ===== Bridge: export wallet =====
  useEffect(() => {
    window.__privyExportWallet = () => {
      const embedded = wallets.find((w) => w.walletClientType === 'privy');
      if (!embedded) {
        if (typeof window.showToast === 'function') {
          window.showToast('⚠️ Không tìm thấy ví Privy để export.');
        }
        return;
      }
      exportWallet({ address: embedded.address }).catch((e) => {
        console.error(e);
      });
    };
    return () => {
      delete window.__privyExportWallet;
    };
  }, [wallets, exportWallet]);

  // ===== Bridge: logout =====
  useEffect(() => {
    window.__privyLogout = () => {
      loggedInOnce.current = false;
      logout();
    };
    return () => {
      delete window.__privyLogout;
    };
  }, [logout]);

  // ===== Watch Privy auth state -> call legacy onLogin(u) =====
  useEffect(() => {
    if (!ready) return;

    if (!authenticated) {
      // If we were logged in before and now we're not, reflect logout in legacy UI
      if (loggedInOnce.current && typeof window.logoutUserUI === 'function') {
        window.logoutUserUI();
      }
      return;
    }

    // Wait until legacy.js has loaded and exposed onLogin
    const tryLogin = () => {
      if (typeof window.onLogin !== 'function') {
        setTimeout(tryLogin, 100);
        return;
      }

      // Determine login provider from linked accounts
      const accounts = privyUser?.linkedAccounts || [];
      let provider = 'google';
      if (accounts.some((a) => a.type === 'twitter_oauth')) provider = 'twitter';
      else if (accounts.some((a) => a.type === 'discord_oauth')) provider = 'discord';
      else if (accounts.some((a) => a.type === 'tiktok_oauth')) provider = 'tiktok';
      else if (accounts.some((a) => a.type === 'google_oauth')) provider = 'google';
      else if (
        accounts.some(
          (a) => a.type === 'wallet' && a.walletClientType && a.walletClientType !== 'privy'
        )
      )
        provider = 'metamask';

      // Find the wallet address: prefer embedded (Privy) wallet, fall back to any connected wallet
      const embedded = wallets.find((w) => w.walletClientType === 'privy');
      const anyWallet = wallets[0];
      const address = embedded?.address || anyWallet?.address;

      if (!address) {
        // Wallet still being created — retry shortly
        setTimeout(tryLogin, 250);
        return;
      }

      const u = {
        provider,
        name: displayNameFor(privyUser, provider),
        address: shortAddr(address),
        fullAddress: address,
        avatar: ICONS[provider] || '👤',
      };

      loggedInOnce.current = true;
      window.onLogin(u);
    };

    tryLogin();
  }, [ready, authenticated, privyUser, wallets]);

  return (
    <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
  );
}
