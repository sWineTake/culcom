import React, { useState, useEffect } from 'react';
import './PWAInstallButton.css';

const PWAInstallButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showManualInstructions, setShowManualInstructions] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  // 브라우저 및 OS 감지
  const detectPlatform = () => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent);
    const isChrome = /chrome/.test(userAgent);
    const isAndroid = /android/.test(userAgent);

    return {
      isIOS: isIOSDevice,
      isSafari: isSafari,
      isChrome: isChrome,
      isAndroid: isAndroid,
      isStandalone: window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
    };
  };

  useEffect(() => {
    const platform = detectPlatform();
    setIsIOS(platform.isIOS);

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

    // 이미 설치된 상태인지 확인
    if (platform.isStandalone) {
      setIsInstalled(true);
    } else {
      // Chrome Android가 아닌 경우 수동 설치 가능으로 표시
      if (platform.isIOS || !platform.isChrome) {
        setIsInstallable(true);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
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
    } else {
      // deferredPrompt가 없으면 수동 설치 안내 표시
      setShowManualInstructions(true);
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
    <>
      <button className="pwa-install-button" onClick={handleInstallClick}>
        <span className="install-icon">📱</span>
        <span className="install-text">홈화면에 추가</span>
      </button>
      
      {/* 수동 설치 안내 모달 */}
      {showManualInstructions && (
        <div className="install-modal-overlay" onClick={() => setShowManualInstructions(false)}>
          <div className="install-modal" onClick={(e) => e.stopPropagation()}>
            <div className="install-modal-header">
              <h3>📱 홈화면에 추가하기</h3>
              <button 
                className="install-modal-close" 
                onClick={() => setShowManualInstructions(false)}
              >
                ×
              </button>
            </div>
            <div className="install-modal-content">
              {isIOS ? (
                <div className="install-instructions ios">
                  <p><strong>Safari에서 홈화면에 추가하는 방법:</strong></p>
                  <div className="install-steps">
                    <div className="install-step">
                      <span className="step-number">1</span>
                      <span className="step-text">하단의 공유 버튼 <span className="share-icon">⬆️</span> 을 탭하세요</span>
                    </div>
                    <div className="install-step">
                      <span className="step-number">2</span>
                      <span className="step-text">"홈 화면에 추가" <span className="add-icon">➕</span> 를 선택하세요</span>
                    </div>
                    <div className="install-step">
                      <span className="step-number">3</span>
                      <span className="step-text">"추가" 버튼을 탭하세요</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="install-instructions android">
                  <p><strong>브라우저에서 홈화면에 추가하는 방법:</strong></p>
                  <div className="install-steps">
                    <div className="install-step">
                      <span className="step-number">1</span>
                      <span className="step-text">브라우저 메뉴 <span className="menu-icon">⋮</span> 를 탭하세요</span>
                    </div>
                    <div className="install-step">
                      <span className="step-number">2</span>
                      <span className="step-text">"홈화면에 추가" 또는 "앱 설치" 를 선택하세요</span>
                    </div>
                    <div className="install-step">
                      <span className="step-number">3</span>
                      <span className="step-text">"추가" 또는 "설치" 버튼을 탭하세요</span>
                    </div>
                  </div>
                </div>
              )}
              <div className="install-benefits">
                <p><strong>홈화면에 추가하면:</strong></p>
                <ul>
                  <li>🚀 빠른 실행</li>
                  <li>📱 앱처럼 사용</li>
                  <li>🔄 오프라인 사용 가능</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PWAInstallButton;