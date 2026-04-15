import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kssvbgwruldccgxnsofl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtzc3ZiZ3dydWxkY2NneG5zb2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNzM4MzcsImV4cCI6MjA5MTc0OTgzN30.ETMTIzOStqTfp1Y-K-i4eep9e9qJkBN9iAMvcxRE2Qg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
