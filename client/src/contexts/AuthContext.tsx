import React, { createContext, useContext, useEffect, useState } from 'react';
import apiClient, { ApiResponse } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { SubscriptionModal } from '@/components/subscription/SubscriptionModal';

interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: string;
  companyName?: string;
  preferences: any;
  permissions?: string[]; // Array of permission strings
  subscription?: {
    isActive: boolean;
    plan: string;
    startDate?: string;
    endDate?: string;
    autoRenew?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  session: any | null; // For compatibility, but not used with new backend
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  hasPermission: (permission: string) => boolean; // Check if user has a specific permission
  refreshUser: () => Promise<User | undefined>;
  showSubscriptionModal: boolean;
  setShowSubscriptionModal: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const { toast } = useToast();

  // Check subscription status and show modal if needed
  const checkSubscriptionStatus = (userData: User) => {
    // Only the admin holds the licence and pays for it. Staff, managers and
    // every other role are created under that subscription and carry none of
    // their own, so testing them against it would put the whole team behind a
    // payment screen they have no way to act on.
    if (userData.role !== 'admin') {
      setShowSubscriptionModal(false);
      return;
    }

    // Show modal if subscription is not active or doesn't exist
    if (!userData.subscription || !userData.subscription.isActive) {
      setShowSubscriptionModal(true);
    } else {
      setShowSubscriptionModal(false);
    }
  };

  // Determine if modal can be closed (only if subscription exists and is not undefined)
  const canCloseModal = user?.subscription !== undefined;

  useEffect(() => {
    // Check for existing token and user
    const checkAuthStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const userData = await apiClient.getCurrentUser();
          setUser(userData);
          setSession({ user: userData });
          checkSubscriptionStatus(userData);
        }
      } catch (error) {
        // Token is invalid, clear it
        apiClient.clearToken();
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await apiClient.login(email, password);
      
      console.log(' AuthContext signIn response:', response);
      console.log('🔑 AuthContext signIn response:', response);
      
      setUser(response.user);
      setSession({ user: response.user });
      checkSubscriptionStatus(response.user);
      
      console.log('🔑 User set in AuthContext:', response.user);
      
      toast({
        title: "Welcome back!",
        description: "You've been signed in successfully.",
      });

      return { error: null };
    } catch (error: any) {
      console.error('🔑 AuthContext signIn error:', error);
      toast({
        title: "Sign In Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
      return { error };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const response = await apiClient.register(email, password, fullName || '');
      
      setUser(response.user);
      setSession({ user: response });

      toast({
        title: "Account Created!",
        description: "Welcome to SerpY ERP System.",
      });

      return { error: null };
    } catch (error: any) {
      toast({
        title: "Sign Up Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await apiClient.logout();
      setUser(null);
      setSession(null);
      
      toast({
        title: "Signed out",
        description: "You've been signed out successfully.",
      });
    } catch (error) {
      // Even if logout fails on server, clear local state
      setUser(null);
      setSession(null);
      apiClient.clearToken();
      
      toast({
        title: "Signed out",
        description: "You've been signed out successfully.",
      });
    }
  };

  const hasPermission = (permission: string): boolean => {
    // Admin has full access to everything
    if (user?.role === 'admin') {
      return true;
    }
    // Staff and Manager: check if user has the specific permission
    return user?.permissions?.includes(permission) || false;
  };

  // Re-fetch the current user (e.g. after a successful subscription payment)
  // so the subscription gate updates immediately and stays correct on refresh.
  const refreshUser = async () => {
    try {
      const userData = await apiClient.getCurrentUser();
      setUser(userData);
      setSession({ user: userData });
      checkSubscriptionStatus(userData);
      return userData;
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    hasPermission,
    refreshUser,
    showSubscriptionModal,
    setShowSubscriptionModal,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <SubscriptionModal
        open={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        userPlan={user?.subscription?.plan}
        onPaymentSuccess={refreshUser}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}