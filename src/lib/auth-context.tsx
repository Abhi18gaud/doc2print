'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { Owner, Shop, PriceConfig } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  owner: Owner | null;
  shop: Shop | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshShop: () => Promise<void>;
  setShop: (shop: Shop) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOwnerAndShop = async (userId: string) => {
    try {
      // 1. Fetch Owner
      const { data: ownerData } = await supabase
        .from('owners')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (ownerData) {
        setOwner(ownerData);
      }

      // 2. Fetch Shop(s) for this owner
      const { data: shopData } = await supabase
        .from('shops')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (shopData) {
        setShop(shopData);
        sessionStorage.setItem('qp_active_shop_id', shopData.id);
        sessionStorage.setItem('qp_active_shop_slug', shopData.qr_code_slug);
      } else {
        // Fallback: Check if there is a session-stored shop ID from onboarding
        const savedShopId = sessionStorage.getItem('qp_owner_shop_id');
        if (savedShopId) {
          const { data: fallbackShop } = await supabase
            .from('shops')
            .select('*')
            .eq('id', savedShopId)
            .maybeSingle();
          if (fallbackShop) setShop(fallbackShop);
        }
      }
    } catch (err) {
      console.error('Error fetching owner/shop data:', err);
    }
  };

  useEffect(() => {
    // Initial Session Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchOwnerAndShop(session.user.id).finally(() => setLoading(false));
      } else {
        // If not logged in, check if there's a stored active shop
        const savedShopId = sessionStorage.getItem('qp_owner_shop_id') || sessionStorage.getItem('qp_active_shop_id');
        if (savedShopId) {
          supabase
            .from('shops')
            .select('*')
            .eq('id', savedShopId)
            .maybeSingle()
            .then(({ data }) => {
              if (data) setShop(data);
              setLoading(false);
            });
        } else {
          setLoading(false);
        }
      }
    });

    // Listen to Auth State Changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchOwnerAndShop(session.user.id);
      } else {
        setOwner(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const refreshShop = async () => {
    if (shop?.id) {
      const { data } = await supabase
        .from('shops')
        .select('*')
        .eq('id', shop.id)
        .single();
      if (data) setShop(data);
    } else if (user?.id) {
      await fetchOwnerAndShop(user.id);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem('qp_owner_shop_id');
    sessionStorage.removeItem('qp_active_shop_id');
    sessionStorage.removeItem('qp_active_shop_slug');
    setUser(null);
    setSession(null);
    setOwner(null);
    setShop(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        owner,
        shop,
        loading,
        logout,
        refreshShop,
        setShop,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
