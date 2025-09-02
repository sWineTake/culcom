import React, { useState, useEffect } from 'react';
import './PWAInstallButton.css';

const PWAInstallButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone === true) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstallable(false);
        setDeferredPrompt(null);
      }
    } catch (error) {
      console.error('설치 프롬프트 오류:', error);
    }
  };

  if (isInstalled) {
    return (
      <div className="pwa-install-status installed">
        <span className="install-icon">✅</span>
        <span className="install-text">앱이 설치되었습니다</span>
      </div>
    );
  }

  if (!isInstallable) {
    return null;
  }

  return (
    <button className="pwa-install-button" onClick={handleInstallClick}>
      <span className="install-icon">📱</span>
      <span className="install-text">홈화면에 추가</span>
    </button>
  );
};

export default PWAInstallButton;