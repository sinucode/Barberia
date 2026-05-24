// ============================================================
// types/database.ts  —  "The Vault" — Tipos estrictos de Xinuco
// ============================================================

// ---------- Tipo base para columnas JSONB de PostgreSQL ----------
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[]

// ---------- Branding del tenant ----------
export interface BusinessBranding {
  primary_color:   string   // Ej: "#C5A059"
  secondary_color: string   // Surface / cards
  bg_color:        string   // Fondo principal
  text_color:      string   // Texto principal
  logo_url:        string | null
  font_family:     string   // Ej: "Inter" | "Bebas Neue"
}

// ---------- Brand Config (columna JSONB: brand_config) — FUENTE ÚNICA DE VERDAD ----------
export interface BrandConfig {
  primaryColor:    string   // Hex: "#C5A059"
  secondaryColor:  string   // Surface / cards: "#1A1A1A"
  bgColor:         string   // Fondo principal: "#080808"
  textColor:       string   // Texto principal: "#F4F4F4"
  fontFamily:      string   // Ej: "inter" | "playfair" | "oswald"
  logoUrl?:        string   // URL del logo (opcional)
}

// ---------- Feature Flags ----------
export interface BusinessFeatures {
  loyalty: boolean;
  inventory: boolean;
  advanced_reports: boolean;
}

// ---------- Operating Hours ----------
export interface DayHours {
  is_open: boolean
  open_time: string
  close_time: string
}

export interface OperatingHours {
  monday: DayHours
  tuesday: DayHours
  wednesday: DayHours
  thursday: DayHours
  friday: DayHours
  saturday: DayHours
  sunday: DayHours
}

// ---------- Tabla: businesses ----------
export interface Business {
  id:               string             // UUID
  name:             string
  slug:             string             // Identificador único de URL
  is_active:        boolean
  branding:         BusinessBranding
  features_enabled: BusinessFeatures
  brand_config:     BrandConfig        // JSONB — tema visual del tenant
  operating_hours?: OperatingHours     // JSONB
  workstations_count?: number          // INT
  created_at:       string
}

// ---------- Tabla: profiles ----------
export type UserRole = 'super_admin' | 'admin' | 'barber' | 'manicurist'

export interface Profile {
  id:          string     // UUID — mismo que auth.users.id
  business_id: string     // UUID → businesses.id
  full_name:   string
  role:        UserRole
  avatar_url:  string | null
  created_at:  string
}

// ---------- Tabla: customers ----------
export interface Customer {
  id:          string
  business_id: string
  full_name:   string
  phone:       string
  email:       string | null
  created_at:  string
  updated_at:  string
}

// ---------- Tabla: appointments ----------
export type AppointmentStatus = 'scheduled' | 'in_progress' | 'ready_to_pay' | 'completed' | 'cancelled' | 'no_show';
export type ShiftStatus = 'open' | 'closed';
export type SaleStatus = 'pending' | 'paid' | 'voided';
export type ItemType = 'service' | 'product';
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'loyalty_points' | 'mixed';

export interface Appointment {
  id:            string
  business_id:   string
  staff_id:      string | null 
  customer_id:   string
  service_id:    string
  status:        AppointmentStatus
  // -- DEPRECADO: Mantenido temporalmente para compatibilidad UI --
  customer_name?: string
  customer_phone?: string | null
  service_name?:  string | null
  barber_id?:     string | null
  // ---------------------------------------------------------------
  /**
   * TSTZRANGE viene de Supabase como string con formato:
   * '["2025-01-01 10:00:00+00","2025-01-01 11:00:00+00")'
   * Parsear con parseTimeRange() de @/lib/utils/time
   */
  time_range?:    string
  start_time?:    string
  notes:         string | null
  created_at:    string
  updated_at:    string
}

// ---------- Tabla: services ----------
export interface Service {
  id:                 string
  business_id:        string
  name:               string
  description:        string | null
  duration_minutes:   number
  price_cop:          number
  is_active:          boolean
  created_at:         string
  updated_at:         string
}

// ---------- Tabla: staff ----------
export type StaffRole = 'super_admin' | 'admin' | 'barber' | 'manicurist'

export interface Staff {
  id:             string
  business_id:    string
  user_id?:       string | null  // UUID → auth.users.id (null si el empleado no tiene cuenta)
  name?:          string         // deprecado (mantener por compatibilidad temporal si es necesario)
  full_name:      string
  specialty_role: string
  role?:          StaffRole      // deprecado
  is_active:      boolean
  created_at:     string
  updated_at:     string
}

// ---------- Tabla: staff_services (pivot) ----------
export interface StaffService {
  staff_id:    string   // → staff.id
  service_id:  string   // → services.id
  business_id: string   // → businesses.id (redundante para RLS)
}

// ---------- Tabla: staff_schedules ----------
export interface StaffSchedule {
  id:          string
  business_id: string   // → businesses.id
  staff_id:    string   // → staff.id
  day_of_week: number   // 0 = Domingo, 1 = Lunes … 6 = Sábado
  start_time:  string   // TIME, ej: '09:00'
  end_time:    string   // TIME, ej: '18:00'
}

// ---------- Helpers tipados ----------
/**
 * Tipo Row genérico para cualquier tabla — facilita la generación de inserts
 */
export type InsertRow<T extends { id: string; created_at: string }> =
  Omit<T, 'id' | 'created_at'>

export type BusinessInsert   = InsertRow<Business>
export type ProfileInsert    = InsertRow<Profile>
export type AppointmentInsert= InsertRow<Appointment> & { updated_at?: string }

// ---------- Database (shape para @supabase/ssr) ----------
export interface Database {
  public: {
    Tables: {
      businesses: {
        Row:    Business
        Insert: BusinessInsert
        Update: Partial<BusinessInsert>
      }
      profiles: {
        Row:    Profile
        Insert: ProfileInsert
        Update: Partial<ProfileInsert>
      }
      appointments: {
        Row:    Appointment
        Insert: AppointmentInsert
        Update: Partial<AppointmentInsert>
      }
      customers: {
        Row:    Customer
        Insert: Omit<Customer, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Customer, 'id' | 'created_at' | 'updated_at'>>
      }
      services: {
        Row:    Service
        Insert: Omit<Service, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Service, 'id' | 'created_at' | 'updated_at'>>
      }
      staff: {
        Row:    Staff
        Insert: Omit<Staff, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Staff, 'id' | 'created_at' | 'updated_at'>>
      }
      staff_services: {
        Row:    StaffService
        Insert: StaffService
        Update: Partial<StaffService>
      }
      staff_schedules: {
        Row:    StaffSchedule
        Insert: Omit<StaffSchedule, 'id'>
        Update: Partial<Omit<StaffSchedule, 'id'>>
      }
      cash_register_shifts: {
        Row:    CashRegisterShift
        // closed_by, closed_at y actual_closing_balance son NULL al abrir turno → opcionales en Insert
        Insert: Omit<CashRegisterShift, 'id' | 'created_at' | 'closed_by' | 'closed_at' | 'actual_closing_balance'> & {
          closed_by?:               string | null
          closed_at?:               string | null
          actual_closing_balance?:  number | null
        }
        Update: Partial<Omit<CashRegisterShift, 'id' | 'created_at'>>
      }
      sales: {
        Row:    Sale
        Insert: Omit<Sale, 'id' | 'created_at'>
        Update: Partial<Omit<Sale, 'id' | 'created_at'>>
      }
      sale_items: {
        Row:    SaleItem
        Insert: Omit<SaleItem, 'id' | 'created_at'>
        Update: Partial<Omit<SaleItem, 'id' | 'created_at'>>
      }
      payments: {
        Row:    Payment
        Insert: Omit<Payment, 'id' | 'created_at'>
        Update: Partial<Omit<Payment, 'id' | 'created_at'>>
      }
    }
    Functions: {
      // RPC atómico de cobro — reemplaza 4 inserts separados con una transacción real
      checkout_appointment: {
        Args: {
          p_appointment_id:  string
          p_business_id:     string
          p_shift_id:        string
          p_payment_method:  string
          p_tip_amount?:     number
          p_discount_amount?: number
          p_items?:          Json
        }
        Returns: Json
      }
      // RPC de disponibilidad de slots — calcula huecos libres en el calendario
      get_available_slots: {
        Args: {
          p_business_id:      string
          p_staff_id:         string | null
          p_date:             string
          p_duration_minutes: number
        }
        Returns: Json
      }
      // RPC de seguridad — inyecta el slug del tenant en app_metadata del JWT
      secure_set_user_context: {
        Args: { business_slug: string }
        Returns: void
      }
    }
  }
}

// ---------- Módulos de Caja y Ventas ----------
export interface CashRegisterShift {
  id: string;
  business_id: string;
  opened_by: string | null;
  closed_by: string | null;
  opened_at: string;
  closed_at: string | null;
  status: ShiftStatus;
  opening_balance: number;
  actual_closing_balance: number | null;
  created_at: string;
}

export interface Sale {
  id: string;
  business_id: string;
  shift_id: string;
  appointment_id: string | null;
  customer_id: string | null;
  subtotal: number;
  discount_amount: number;
  tip_amount: number;
  total_amount: number;
  status: SaleStatus;
  created_at: string;
}

export interface SaleItem {
  id: string;
  business_id: string;
  sale_id: string;
  staff_id: string | null;
  item_type: ItemType;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface Payment {
  id: string;
  business_id: string;
  sale_id: string;
  shift_id: string;
  amount: number;
  payment_method: PaymentMethod;
  created_at: string;
}
