// PWA Service - Register service worker and handle PWA features

export interface PWAInstallPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

class PWAService {
  private deferredPrompt: PWAInstallPrompt | null = null;
  private isInstalled = false;
  private registration: ServiceWorkerRegistration | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private init() {
    // Check if already installed
    this.checkIfInstalled();

    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e as any;
      console.log('[PWA] Install prompt available');
      
      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('pwa-install-available'));
    });

    // Listen for appinstalled event
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed');
      this.isInstalled = true;
      this.deferredPrompt = null;
      
      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('pwa-installed'));
    });

    // Check for updates periodically
    if ('serviceWorker' in navigator) {
      setInterval(() => {
        this.checkForUpdates();
      }, 60000); // Check every minute
    }
  }

  /**
   * Register service worker
   */
  async register(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
      console.warn('[PWA] Service workers not supported');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      this.registration = registration;

      console.log('[PWA] Service worker registered:', registration.scope);

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] New version available');
              window.dispatchEvent(new CustomEvent('pwa-update-available'));
            }
          });
        }
      });

      return registration;
    } catch (error) {
      console.error('[PWA] Service worker registration failed:', error);
      return null;
    }
  }

  /**
   * Unregister service worker
   */
  async unregister(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const success = await registration.unregister();
      console.log('[PWA] Service worker unregistered:', success);
      return success;
    } catch (error) {
      console.error('[PWA] Service worker unregistration failed:', error);
      return false;
    }
  }

  /**
   * Show install prompt
   */
  async showInstallPrompt(): Promise<boolean> {
    if (!this.deferredPrompt) {
      console.warn('[PWA] Install prompt not available');
      return false;
    }

    try {
      await this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      
      console.log('[PWA] Install prompt outcome:', outcome);
      
      if (outcome === 'accepted') {
        this.isInstalled = true;
      }
      
      this.deferredPrompt = null;
      return outcome === 'accepted';
    } catch (error) {
      console.error('[PWA] Install prompt failed:', error);
      return false;
    }
  }

  /**
   * Check if PWA is installed
   */
  checkIfInstalled(): boolean {
    // Check if running in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;
    
    this.isInstalled = isStandalone || isIOSStandalone;
    return this.isInstalled;
  }

  /**
   * Check if install prompt is available
   */
  isInstallAvailable(): boolean {
    return this.deferredPrompt !== null;
  }

  /**
   * Get installation status
   */
  getInstallStatus(): {
    isInstalled: boolean;
    isAvailable: boolean;
    isSupported: boolean;
  } {
    return {
      isInstalled: this.isInstalled,
      isAvailable: this.deferredPrompt !== null,
      isSupported: 'serviceWorker' in navigator,
    };
  }

  /**
   * Check for service worker updates
   */
  async checkForUpdates(): Promise<void> {
    if (!this.registration) {
      return;
    }

    try {
      await this.registration.update();
      console.log('[PWA] Checked for updates');
    } catch (error) {
      console.error('[PWA] Update check failed:', error);
    }
  }

  /**
   * Skip waiting and activate new service worker
   */
  async skipWaiting(): Promise<void> {
    if (!this.registration || !this.registration.waiting) {
      return;
    }

    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    
    // Reload page after new SW activates
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }

  /**
   * Request notification permission
   */
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('[PWA] Notifications not supported');
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      console.log('[PWA] Notification permission:', permission);
      return permission;
    } catch (error) {
      console.error('[PWA] Notification permission request failed:', error);
      return 'denied';
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPush(vapidPublicKey: string): Promise<PushSubscription | null> {
    if (!this.registration) {
      console.warn('[PWA] Service worker not registered');
      return null;
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey),
      });

      console.log('[PWA] Push subscription created');
      return subscription;
    } catch (error) {
      console.error('[PWA] Push subscription failed:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribeFromPush(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription) {
        const success = await subscription.unsubscribe();
        console.log('[PWA] Push unsubscribed:', success);
        return success;
      }
      return false;
    } catch (error) {
      console.error('[PWA] Push unsubscribe failed:', error);
      return false;
    }
  }

  /**
   * Helper to convert VAPID key
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }
}

// Export singleton instance
export const pwaService = new PWAService();

// React hook for PWA features
export function usePWA() {
  const [installStatus, setInstallStatus] = React.useState(pwaService.getInstallStatus());
  const [updateAvailable, setUpdateAvailable] = React.useState(false);

  React.useEffect(() => {
    // Register service worker
    pwaService.register();

    // Listen for install available
    const handleInstallAvailable = () => {
      setInstallStatus(pwaService.getInstallStatus());
    };

    // Listen for installed
    const handleInstalled = () => {
      setInstallStatus(pwaService.getInstallStatus());
    };

    // Listen for update available
    const handleUpdateAvailable = () => {
      setUpdateAvailable(true);
    };

    window.addEventListener('pwa-install-available', handleInstallAvailable);
    window.addEventListener('pwa-installed', handleInstalled);
    window.addEventListener('pwa-update-available', handleUpdateAvailable);

    return () => {
      window.removeEventListener('pwa-install-available', handleInstallAvailable);
      window.removeEventListener('pwa-installed', handleInstalled);
      window.removeEventListener('pwa-update-available', handleUpdateAvailable);
    };
  }, []);

  const install = async () => {
    const success = await pwaService.showInstallPrompt();
    if (success) {
      setInstallStatus(pwaService.getInstallStatus());
    }
    return success;
  };

  const update = async () => {
    await pwaService.skipWaiting();
    setUpdateAvailable(false);
  };

  return {
    ...installStatus,
    updateAvailable,
    install,
    update,
  };
}

// Add React import for the hook
import React from 'react';
