import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export type MerchantStaff =
  Database['public']['Functions']['list_merchant_staff']['Returns'][number];

export async function fetchMerchantStaff(merchantId: string): Promise<MerchantStaff[]> {
  const { data, error } = await supabase.rpc('list_merchant_staff', {
    p_merchant: merchantId,
  });
  if (error) throw error;
  return data ?? [];
}

export async function createMerchantStaff(input: {
  merchantId: string;
  name: string;
  pin: string;
}): Promise<MerchantStaff> {
  const { data, error } = await supabase.rpc('create_merchant_staff', {
    p_merchant: input.merchantId,
    p_name: input.name.trim(),
    p_pin: input.pin,
  });
  if (error) throw error;
  const staff = data?.[0];
  if (!staff) throw new Error('STAFF_CREATE_FAILED');
  return staff;
}

export async function setMerchantStaffActive(input: {
  staffId: string;
  active: boolean;
}): Promise<void> {
  const { error } = await supabase.rpc('set_merchant_staff_active', {
    p_staff: input.staffId,
    p_active: input.active,
  });
  if (error) throw error;
}

export async function changeMerchantStaffPin(input: {
  staffId: string;
  pin: string;
}): Promise<void> {
  const { error } = await supabase.rpc('change_merchant_staff_pin', {
    p_staff: input.staffId,
    p_pin: input.pin,
  });
  if (error) throw error;
}

export async function openMerchantStaffSession(input: {
  merchantId: string;
  pin: string;
}) {
  const { data, error } = await supabase.rpc('open_merchant_staff_session', {
    p_merchant: input.merchantId,
    p_pin: input.pin,
    p_device_label: `${Platform.OS} Waffiy`,
  });
  if (error) throw error;
  const row = data?.[0];
  if (!row) throw new Error('INVALID_STAFF_PIN');
  return {
    token: row.session_token,
    staffId: row.staff_id,
    staffName: row.staff_name,
    merchantId: input.merchantId,
    expiresAt: row.expires_at,
  };
}

export async function closeMerchantStaffSession(token: string): Promise<void> {
  const { error } = await supabase.rpc('close_merchant_staff_session', {
    p_session_token: token,
  });
  if (error) throw error;
}

export async function confirmOwnerPassword(password: string): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const email = data.session?.user.email;
  if (!email) throw new Error('OWNER_EMAIL_REQUIRED');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}
