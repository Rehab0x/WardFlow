export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          display_name: string;
          department: string | null;
          role: 'admin' | 'doctor' | 'nurse' | 'therapist';
          status: 'pending' | 'approved' | 'rejected';
          modules: string[];
          approved_by: string | null;
          approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          display_name: string;
          department?: string | null;
          role?: 'admin' | 'doctor' | 'nurse' | 'therapist';
          status?: 'pending' | 'approved' | 'rejected';
          modules?: string[];
          approved_by?: string | null;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      patients: {
        Row: {
          id: string;
          registration_number: string;
          name: string;
          birth_date: string;
          sex: 'M' | 'F';
          room_bed: string;
          admission_date: string;
          discharge_date: string | null;
          attending_physician: string | null;
          patient_type: 'admitted' | 'consult';
          status: 'active' | 'discharged' | 'archived';
          created_by: string;
          attention: boolean;
          tags: string[];
          chief_complaint: string;
          onset: string;
          present_illness: string;
          past_history: string;
          review_of_system: string;
          physical_exam: string;
          problem_list: string[];
          plan: string;
          guardian_explanation: string;
          etc: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          registration_number: string;
          name: string;
          birth_date: string;
          sex: 'M' | 'F';
          room_bed: string;
          admission_date: string;
          discharge_date?: string | null;
          attending_physician?: string | null;
          patient_type: 'admitted' | 'consult';
          status?: 'active' | 'discharged' | 'archived';
          created_by: string;
          attention?: boolean;
          tags?: string[];
          chief_complaint?: string;
          onset?: string;
          present_illness?: string;
          past_history?: string;
          review_of_system?: string;
          physical_exam?: string;
          problem_list?: string[];
          plan?: string;
          guardian_explanation?: string;
          etc?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['patients']['Insert']>;
        Relationships: [];
      };
      patient_shares: {
        Row: {
          patient_id: string;
          user_id: string;
          access_level: 'read' | 'write';
          created_at: string;
        };
        Insert: {
          patient_id: string;
          user_id: string;
          access_level: 'read' | 'write';
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['patient_shares']['Insert']>;
        Relationships: [];
      };
      notes: {
        Row: {
          id: string;
          patient_id: string;
          content: string;
          type: 'progress' | 'reminder';
          alert_date: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          patient_id: string;
          content: string;
          type: 'progress' | 'reminder';
          alert_date?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['notes']['Insert']>;
        Relationships: [];
      };
      schedules: {
        Row: {
          id: string;
          patient_id: string;
          title: string;
          scheduled_date: string;
          scheduled_time: string | null;
          category: string;
          is_completed: boolean;
          notes: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          patient_id: string;
          title: string;
          scheduled_date: string;
          scheduled_time?: string | null;
          category: string;
          is_completed?: boolean;
          notes?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['schedules']['Insert']>;
        Relationships: [];
      };
      medications: {
        Row: {
          id: string;
          patient_id: string;
          category: 'hospital' | 'personal' | 'antibiotic';
          drug_name: string;
          drug_base_name: string;
          single_dose: number | null;
          schedule: string;
          timing: string | null;
          days_remaining: number | null;
          dosage: string | null;
          frequency: string | null;
          start_date: string;
          end_date: string | null;
          is_active: boolean;
          notes: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          patient_id: string;
          category: 'hospital' | 'personal' | 'antibiotic';
          drug_name: string;
          drug_base_name?: string;
          single_dose?: number | null;
          schedule?: string;
          timing?: string | null;
          days_remaining?: number | null;
          dosage?: string | null;
          frequency?: string | null;
          start_date: string;
          end_date?: string | null;
          is_active?: boolean;
          notes?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['medications']['Insert']>;
        Relationships: [];
      };
      lab_results: {
        Row: {
          id: string;
          patient_id: string;
          test_date: string;
          category: string;
          source: 'manual' | 'parsed' | 'csv' | 'xls';
          raw_text: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          patient_id: string;
          test_date: string;
          category: string;
          source: 'manual' | 'parsed' | 'csv' | 'xls';
          raw_text?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['lab_results']['Insert']>;
        Relationships: [];
      };
      lab_items: {
        Row: {
          id: string;
          lab_result_id: string;
          code: string | null;
          name: string;
          value_text: string;
          value_numeric: number | null;
          unit: string;
          reference_min: number | null;
          reference_max: number | null;
          is_abnormal: boolean;
          hl_flag: 'H' | 'L' | null;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lab_result_id: string;
          code?: string | null;
          name: string;
          value_text: string;
          value_numeric?: number | null;
          unit?: string;
          reference_min?: number | null;
          reference_max?: number | null;
          is_abnormal?: boolean;
          hl_flag?: 'H' | 'L' | null;
          display_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['lab_items']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'lab_items_lab_result_id_fkey';
            columns: ['lab_result_id'];
            isOneToOne: false;
            referencedRelation: 'lab_results';
            referencedColumns: ['id'];
          },
        ];
      };
      templates: {
        Row: {
          id: string;
          owner_id: string | null;
          field: string;
          name: string;
          content: string;
          scope: 'personal' | 'department' | 'global';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string | null;
          field: string;
          name: string;
          content: string;
          scope?: 'personal' | 'department' | 'global';
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['templates']['Insert']>;
        Relationships: [];
      };
      lab_categories: {
        Row: {
          id: string;
          owner_id: string | null;
          name: string;
          display_order: number;
          items: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string | null;
          name: string;
          display_order: number;
          items?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['lab_categories']['Insert']>;
        Relationships: [];
      };
      user_settings: {
        Row: {
          user_id: string;
          key: string;
          value: Json;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          key: string;
          value: Json;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_settings']['Insert']>;
        Relationships: [];
      };
      backup_snapshots: {
        Row: {
          id: string;
          owner_id: string;
          kind: 'manual' | 'automatic' | 'migration';
          encrypted_data: string;
          record_counts: Json;
          content_hash: string | null;
          app_version: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          kind: 'manual' | 'automatic' | 'migration';
          encrypted_data: string;
          record_counts: Json;
          content_hash?: string | null;
          app_version?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['backup_snapshots']['Insert']>;
        Relationships: [];
      };
      backups: {
        Row: {
          user_key: string;
          encrypted_data: string;
          updated_at: string;
        };
        Insert: {
          user_key: string;
          encrypted_data: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['backups']['Insert']>;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          entity_type: string;
          entity_id: string | null;
          action: string;
          before_data: Json | null;
          after_data: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          entity_type: string;
          entity_id?: string | null;
          action: string;
          before_data?: Json | null;
          after_data?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>;
        Relationships: [];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type Inserts<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type Updates<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
