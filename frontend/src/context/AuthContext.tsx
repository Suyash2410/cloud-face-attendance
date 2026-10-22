import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { api } from '../api/client';
import { MOCK_ADMIN, MOCK_TEACHERS, MOCK_STUDENT_USER } from '../mock/seedData';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchRole: (role: Role) => Promise<void>;
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const token = localStorage.getItem('haazri_auth_token');
        if (!token && !api.isMock) {
          setUser(null);
          return;
        }
        const currentUser = await api.auth.getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      if (api.isMock) {
        // Mock Auth simulation
        if (password.toLowerCase() === 'wrong' || password.length < 4) {
          throw new Error('Invalid email or password. Please verify your credentials.');
        }

        const lowerEmail = email.toLowerCase().trim();
        let targetUser: User = MOCK_ADMIN;

        if (lowerEmail.includes('admin') || lowerEmail === 'admin@haazri.edu') {
          targetUser = MOCK_ADMIN;
        } else if (lowerEmail.includes('sunita') || lowerEmail.includes('teacher') || lowerEmail.includes('rajesh') || lowerEmail.includes('amit')) {
          targetUser = MOCK_TEACHERS[1]; // Prof. Sunita Kulkarni
        } else if (lowerEmail.includes('aarav') || lowerEmail.includes('student') || lowerEmail.includes('te-')) {
          targetUser = MOCK_STUDENT_USER;
        } else {
          targetUser = {
            userId: `usr-${Date.now()}`,
            role: 'teacher',
            name: email.split('@')[0],
            email
          };
        }

        await api.auth.switchMockRole(targetUser.role);
        setUser(targetUser);
        localStorage.setItem('haazri_auth_token', 'mock_jwt_token_sample');
      } else {
        // REAL AWS Cognito InitiateAuth via USER_PASSWORD_AUTH
        const region = import.meta.env.VITE_AWS_REGION || 'ap-south-1';
        const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID;

        if (!clientId) {
          throw new Error('VITE_COGNITO_CLIENT_ID is not configured in .env');
        }

        const cognitoEndpoint = `https://cognito-idp.${region}.amazonaws.com/`;
        const authPayload = {
          AuthFlow: 'USER_PASSWORD_AUTH',
          ClientId: clientId,
          AuthParameters: {
            USERNAME: email.trim(),
            PASSWORD: password
          }
        };

        const res = await fetch(cognitoEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-amz-json-1.1',
            'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth'
          },
          body: JSON.stringify(authPayload)
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || data.__type || 'Cognito authentication failed. Invalid credentials.');
        }

        // Store IdToken which contains claims (sub, email, cognito:groups)
        const idToken = data.AuthenticationResult?.IdToken || data.AuthenticationResult?.AccessToken;
        localStorage.setItem('haazri_auth_token', idToken);

        const me = await api.auth.getCurrentUser();
        setUser(me);
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('haazri_auth_token');
    setUser(null);
  };

  const switchRole = async (role: Role) => {
    if (!api.isMock) return;
    setLoading(true);
    try {
      const newUser = await api.auth.switchMockRole(role);
      setUser(newUser);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';
  const isStudent = user?.role === 'student';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        switchRole,
        isAdmin,
        isTeacher,
        isStudent
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
