// Hand-written types matching supabase/migrations/0001_init.sql.
// Once the project is linked, replace this with the output of:
//   npx supabase gen types typescript --linked > src/lib/supabase/database.types.ts

export interface Database {
  public: {
    Tables: {
      files: {
        Relationships: [];
        Row: {
          id: string;
          owner_id: string;
          name: string;
          mime_type: string;
          size_bytes: number;
          storage_path: string;
          pos_x: number;
          pos_y: number;
          width: number;
          height: number;
          z_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          name: string;
          mime_type: string;
          size_bytes: number;
          storage_path: string;
          pos_x?: number;
          pos_y?: number;
          width?: number;
          height?: number;
          z_index?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          mime_type?: string;
          size_bytes?: number;
          storage_path?: string;
          pos_x?: number;
          pos_y?: number;
          width?: number;
          height?: number;
          z_index?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
