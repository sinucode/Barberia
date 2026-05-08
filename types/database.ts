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

// ---------- Feature Flags ----------
export interface BusinessFeatures {
  loyalty: boolean;
  inventory: boolean;
  advanced_reports: boolean;
}

// ---------- Tabla: businesses ----------
export interface Business {
  id:               string             // UUID
  name:             string
  slug:             string             // Identificador único de URL
  is_active:        boolean
  branding:         BusinessBranding
  features_enabled: BusinessFeatures
  created_at:       string
}

// ---------- Tabla: profiles ----------
export type UserRole = 'admin' | 'barber'

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
  barber_id:     string   // UUID → profiles.id
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
  id:          string
  business_id: string
  name:        string
  duration_min: number   // duración en minutos
  price:       number
  is_active:   boolean
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
        Insert: Omit<Service, 'id'>
        Update: Partial<Omit<Service, 'id'>>
      }
    }
  }
}
