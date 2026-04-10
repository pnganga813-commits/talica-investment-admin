import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jjspnjgfcmopcdxkskfs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impqc3BuamdmY21vcGNkeGtza2ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDY4NDgsImV4cCI6MjA5MDk4Mjg0OH0.6RvRPRoeIULVxdzPhqCtfWjKM29Elj9_YsgqtDuNNRI';

export const supabase = createClient(supabaseUrl, supabaseKey);

export type Order = {
  id: string;
  customer_name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  product_variant: string;
  quantity: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  created_at: string;
};
