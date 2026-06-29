import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wprkehulgnwarophsrav.supabase.co';       
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwcmtlaHVsZ253YXJvcGhzcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MDUxOTQsImV4cCI6MjA4NTk4MTE5NH0.4JdbliD_2WUKjduoFU9A-Wu-nM0WqBOeIe_Tgb9AExY';                  

export const supabase = createClient(supabaseUrl, supabaseAnonKey);