import { useState, useEffect } from 'react';
import { LoginPage } from './components/LoginPage';
import { DirectorDashboard } from './components/DirectorDashboard';
import { EmployeeDashboard } from './components/EmployeeDashboard';
import { Language } from './services/translations';


// Simple Context Mock for authentication flow
interface AuthState {
  isAuthenticated: boolean;
  user: { id: string; email: string; roles: string[]; profilePictureUrl?: string | null; isHRManager?: boolean; isFirstLogin?: boolean } | null;
}




function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

// ----------------- ROOT WRAPPER -----------------
export default function App() {
  const [auth, setAuth] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('his_theme') as 'light' | 'dark') || 'light';
  });

  const [colorTheme, setColorTheme] = useState<string>(() => {
    return localStorage.getItem('his_color_theme') || 'blue';
  });

  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('his_lang') as Language) || 'en';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
      document.documentElement.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
      document.documentElement.classList.remove('dark-theme');
    }
    localStorage.setItem('his_theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-color-theme', colorTheme);
    document.body.setAttribute('data-color-theme', colorTheme);
    localStorage.setItem('his_color_theme', colorTheme);
  }, [colorTheme]);

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    localStorage.setItem('his_lang', lang);
  }, [lang]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      const decoded = parseJwt(token);
      if (decoded && decoded.exp * 1000 > Date.now()) {
        setAuth({
          isAuthenticated: true,
          user: {
            id: String(decoded.sub || decoded.id || ''),
            email: decoded.username,
            roles: decoded.roles || [],
            profilePictureUrl: decoded.profilePictureUrl || null,
            isHRManager: decoded.isHRManager || false,
            isFirstLogin: decoded.isFirstLogin || false,
          },
        });
      } else {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
    }
  }, []);

  const handleLoginSuccess = (tokenData: { accessToken: string; refreshToken: string; user: { id: string; username: string; roles: string[]; profilePictureUrl?: string | null; isHRManager?: boolean; isFirstLogin?: boolean } }) => {
    localStorage.setItem('access_token', tokenData.accessToken);
    localStorage.setItem('refresh_token', tokenData.refreshToken);
    // Also parse the JWT to get sub/id
    const decoded = parseJwt(tokenData.accessToken);
    setAuth({
      isAuthenticated: true,
      user: {
        id: String(tokenData.user.id || decoded?.sub || ''),
        email: tokenData.user.username,
        roles: tokenData.user.roles,
        profilePictureUrl: tokenData.user.profilePictureUrl || null,
        isHRManager: tokenData.user.isHRManager || decoded?.isHRManager || false,
        isFirstLogin: tokenData.user.isFirstLogin || decoded?.isFirstLogin || false,
      },
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setAuth({
      isAuthenticated: false,
      user: null,
    });
  };

  const handleProfileUpdate = (newProfile: { username: string; profilePictureUrl?: string | null }) => {
    setAuth(prev => {
      if (!prev.user) return prev;
      return {
        ...prev,
        user: {
          ...prev.user,
          email: newProfile.username,
          profilePictureUrl: newProfile.profilePictureUrl !== undefined ? newProfile.profilePictureUrl : prev.user.profilePictureUrl
        }
      };
    });
  };

  return (
    <div className="app-container">
      {auth.isAuthenticated ? (
        auth.user && auth.user.roles.some(r => r === 'ADMINISTRATOR' || r === 'ADMIN') ? (
          <DirectorDashboard
            user={auth.user}
            onProfileUpdate={handleProfileUpdate}
            onLogout={handleLogout}
            theme={theme}
            toggleTheme={toggleTheme}
            colorTheme={colorTheme}
            setColorTheme={setColorTheme}
            lang={lang}
            setLang={setLang}
          />
        ) : (
          <EmployeeDashboard
            user={{
              id: auth.user?.id || '',
              email: auth.user?.email || '',
              roles: auth.user?.roles || [],
              profilePictureUrl: auth.user?.profilePictureUrl,
              isHRManager: auth.user?.isHRManager,
              isFirstLogin: auth.user?.isFirstLogin,
            }}
            onProfileUpdate={handleProfileUpdate}
            onLogout={handleLogout}
            theme={theme}
            toggleTheme={toggleTheme}
            colorTheme={colorTheme}
            setColorTheme={setColorTheme}
            lang={lang}
            setLang={setLang}
          />
        )
      ) : (
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          theme={theme}
          toggleTheme={toggleTheme}
          colorTheme={colorTheme}
          setColorTheme={setColorTheme}
          lang={lang}
          setLang={setLang}
        />
      )}
    </div>
  );
}
