// ============================================================
// types/database.ts  —  "The Vault" — Tipos estrictos de Xinuco
// ============================================================

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

// ---------- Tabla: appointments ----------
export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export interface Appointment {
  id:            string
  business_id:   string   // UUID → businesses.id
  barber_id:     string | null // UUID → profiles.id (nullable if staff is 'any' or not specified)
  customer_name: string
  customer_phone: string | null
  service_name:  string | null
  status:        AppointmentStatus
  /**
   * TSTZRANGE viene de Supabase como string con formato:
   * '["2025-01-01 10:00:00+00","2025-01-01 11:00:00+00")'
   * Parsear con parseTimeRange() de @/lib/utils/time
   */
  time_range:    string
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
  id:          string
  business_id: string
  user_id:     string | null  // nullable — staff sin cuenta auth todavía
  name:        string
  role:        StaffRole
  is_active:   boolean
  created_at:  string
  updated_at:  string
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
    }
  }
}
