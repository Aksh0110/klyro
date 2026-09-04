'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { IUser, AuthResponseData, SendOtpResponseData, IOrganization, IBranch } from '@klyro/types';
import { VerticalType } from '@klyro/config';
import { apiRequest } from './api';

interface AuthContextType {
  user: IUser | null;
  activeOrgId: string | null;
  branches: IBranch[];
  activeBranchId: string | null;
  activeBranch: IBranch | null;
  isLoading: boolean;
  subscriptionStatus: string | null;
  isSubscriptionValid: boolean;
  sendOtp: (phone: string) => Promise<SendOtpResponseData>;
  verifyOtp: (phone: string, otp: string) => Promise<AuthResponseData>;
  createOrganization: (name: string, vertical: VerticalType, ownerName?: string, ownerEmail?: string) => Promise<any>;
  setActiveOrgId: (orgId: string) => void;
  setActiveBranchId: (branchId: string) => void;
  refreshBranches: () => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [activeOrgId, setActiveOrgIdState] = useState<string | null>(null);
  const [branches, setBranches] = useState<IBranch[]>([]);
  const [activeBranchId, setActiveBranchIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [isSubscriptionValid, setIsSubscriptionValid] = useState<boolean>(false);
  const router = useRouter();
  const pathname = usePathname();

  const setActiveOrgId = (orgId: string) => {
    setActiveOrgIdState(orgId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('klyro_active_org_id', orgId);
    }
  };

  const setActiveBranchId = (branchId: string) => {
    setActiveBranchIdState(branchId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('klyro_active_branch_id', branchId);
      window.dispatchEvent(new Event('klyro_branch_changed'));
    }
  };

  const loadBranches = async (orgId: string) => {
    try {
      const branchList = await apiRequest<IBranch[]>('/branches', {}, orgId);
      const list = Array.isArray(branchList) ? branchList : (branchList as any)?.data || [];
      setBranches(list);

      const savedBranchId = typeof window !== 'undefined' ? localStorage.getItem('klyro_active_branch_id') : null;
      if (savedBranchId && list.some((b: IBranch) => b._id === savedBranchId)) {
        setActiveBranchIdState(savedBranchId);
      } else if (list.length > 0) {
        setActiveBranchId(list[0]._id);
      } else {
        setActiveBranchIdState(null);
      }
    } catch (e) {
      console.error('Failed to load branches:', e);
    }
  };

  useEffect(() => {
    if (activeOrgId) {
      loadBranches(activeOrgId);
    }
  }, [activeOrgId]);

  const refreshBranches = async () => {
    if (activeOrgId) {
      await loadBranches(activeOrgId);
    }
  };

  const activeBranch = branches.find((b) => b._id === activeBranchId) || (branches.length > 0 ? branches[0] : null);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('klyro_access_token');
      const savedOrgId = localStorage.getItem('klyro_active_org_id');

      if (!token) {
        setIsLoading(false);
        setSubscriptionStatus(null);
        setIsSubscriptionValid(false);
        if (pathname !== '/login' && pathname !== '/verify-otp') {
          router.push('/login');
        }
        return;
      }

      try {
        const userData = await apiRequest<IUser>('/auth/me');
        setUser(userData);

        let targetOrg = savedOrgId;
        if (!targetOrg && userData.organizationIds.length > 0) {
          targetOrg = userData.organizationIds[0];
        }

        if (targetOrg && userData.organizationIds.includes(targetOrg)) {
          setActiveOrgIdState(targetOrg);
        } else if (userData.organizationIds.length > 0) {
          setActiveOrgId(userData.organizationIds[0]);
        }

        // Route redirection check with strict subscription verification
        if (userData.organizationIds.length === 0) {
          setSubscriptionStatus(null);
          setIsSubscriptionValid(false);
          if (pathname !== '/setup' && pathname !== '/login' && pathname !== '/verify-otp') {
            router.replace('/setup');
          }
        } else if (userData.organizationIds.length > 0) {
          const checkOrgId = targetOrg || userData.organizationIds[0];
          try {
            const subData = await apiRequest<any>('/subscription/current', {}, checkOrgId);
            const subStatus = subData?.subscription?.status || null;
            const valid = subStatus === 'ACTIVE' || subStatus === 'TRIAL';

            setSubscriptionStatus(subStatus);
            setIsSubscriptionValid(valid);

            if (!valid) {
              if (
                pathname !== '/settings/subscription/plans' &&
                pathname !== '/settings/subscription' &&
                pathname !== '/setup/subscription' &&
                pathname !== '/setup' &&
                pathname !== '/login' &&
                pathname !== '/verify-otp'
              ) {
                router.replace('/settings/subscription/plans');
              }
            } else if (pathname === '/login' || pathname === '/verify-otp' || pathname === '/setup') {
              const userRole = userData.roles?.find((r) => r.organizationId === checkOrgId)?.role || 'MEMBER';
              if (userRole === 'MEMBER') {
                router.replace('/member');
              } else {
                router.replace('/dashboard');
              }
            }
          } catch {
            setSubscriptionStatus(null);
            setIsSubscriptionValid(false);
            if (
              pathname !== '/settings/subscription/plans' &&
              pathname !== '/settings/subscription' &&
              pathname !== '/setup/subscription' &&
              pathname !== '/setup' &&
              pathname !== '/login' &&
              pathname !== '/verify-otp'
            ) {
              router.replace('/settings/subscription/plans');
            }
          }
        }
      } catch {
        logout();
      } finally {
        setIsLoading(false);
      }

    };

    initAuth();
  }, [pathname]);

  const sendOtp = async (phone: string): Promise<SendOtpResponseData> => {
    return apiRequest<SendOtpResponseData>('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  };

  const verifyOtp = async (phone: string, otp: string): Promise<AuthResponseData> => {
    const data = await apiRequest<AuthResponseData>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
    });

    localStorage.setItem('klyro_access_token', data.tokens.accessToken);
    localStorage.setItem('klyro_refresh_token', data.tokens.refreshToken);
    setUser(data.user);

    if (data.user.organizationIds.length > 0) {
      const primaryOrgId = data.user.organizationIds[0];
      setActiveOrgId(primaryOrgId);

      try {
        const subData = await apiRequest<any>('/subscription/current', {}, primaryOrgId);
        const subStatus = subData?.subscription?.status || null;
        const valid = subStatus === 'ACTIVE' || subStatus === 'TRIAL';

        setSubscriptionStatus(subStatus);
        setIsSubscriptionValid(valid);


        if (valid) {
          const userRole = data.user.roles?.find((r) => r.organizationId === primaryOrgId)?.role || 'MEMBER';
          if (userRole === 'MEMBER') {
            router.replace('/member');
          } else {
            router.replace('/dashboard');
          }
        } else {
          router.replace('/setup/subscription');
        }
      } catch {
        setSubscriptionStatus(null);
        setIsSubscriptionValid(false);
        router.replace('/setup/subscription');
      }
    } else {
      router.replace('/setup');
    }

    return data;
  };

  const createOrganization = async (name: string, vertical: VerticalType, ownerName?: string, ownerEmail?: string) => {
    const result = await apiRequest<{ organization: IOrganization }>('/organizations', {
      method: 'POST',
      body: JSON.stringify({ name, vertical, ownerName, ownerEmail }),
    });

    const newOrgId = result.organization._id;
    setActiveOrgId(newOrgId);

    // Refresh user state
    const updatedUser = await apiRequest<IUser>('/auth/me');
    setUser(updatedUser);

    setSubscriptionStatus(null);
    setIsSubscriptionValid(false);
    router.replace('/setup/subscription');
    return result;
  };

  const logout = () => {
    localStorage.removeItem('klyro_access_token');
    localStorage.removeItem('klyro_refresh_token');
    localStorage.removeItem('klyro_active_org_id');
    localStorage.removeItem('klyro_active_branch_id');
    setUser(null);
    setActiveOrgIdState(null);
    setActiveBranchIdState(null);
    setBranches([]);
    setSubscriptionStatus(null);
    setIsSubscriptionValid(false);
    router.push('/login');
  };

  const refreshUser = async () => {
    try {
      const userData = await apiRequest<IUser>('/auth/me');
      setUser(userData);
    } catch (e) {
      console.error('Failed to refresh user', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeOrgId,
        branches,
        activeBranchId,
        activeBranch,
        isLoading,
        subscriptionStatus,
        isSubscriptionValid,
        sendOtp,
        verifyOtp,
        createOrganization,
        setActiveOrgId,
        setActiveBranchId,
        refreshBranches,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};


export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
