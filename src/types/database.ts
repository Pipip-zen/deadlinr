export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type UserRole = 'student' | 'admin' | 'superadmin'

export type Database = {
    public: {
        Tables: {
            classes: {
                Row: {
                    id: string
                    name: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    created_at?: string
                }
                Relationships: []
            }
            profiles: {
                Row: {
                    id: string
                    name: string | null
                    avatar_url: string | null
                    class_id: string | null
                    role: UserRole
                    streak_count: number
                    last_active_date: string | null
                    created_at: string
                }
                Insert: {
                    id: string
                    name?: string | null
                    avatar_url?: string | null
                    class_id?: string | null
                    role?: UserRole
                    streak_count?: number
                    last_active_date?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string | null
                    avatar_url?: string | null
                    class_id?: string | null
                    role?: UserRole
                    streak_count?: number
                    last_active_date?: string | null
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: 'profiles_class_id_fkey'
                        columns: ['class_id']
                        isOneToOne: false
                        referencedRelation: 'classes'
                        referencedColumns: ['id']
                    }
                ]
            }
            tasks: {
                Row: {
                    id: string
                    class_id: string
                    course_name: string
                    title: string
                    description: string | null
                    deadline: string
                    created_by: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    class_id: string
                    course_name: string
                    title: string
                    description?: string | null
                    deadline: string
                    created_by: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    class_id?: string
                    course_name?: string
                    title?: string
                    description?: string | null
                    deadline?: string
                    created_by?: string
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: 'tasks_class_id_fkey'
                        columns: ['class_id']
                        isOneToOne: false
                        referencedRelation: 'classes'
                        referencedColumns: ['id']
                    }
                ]
            }
            task_completions: {
                Row: {
                    id: string
                    task_id: string
                    user_id: string
                    completed_at: string
                    points_earned: number
                }
                Insert: {
                    id?: string
                    task_id: string
                    user_id: string
                    completed_at?: string
                    points_earned?: number
                }
                Update: {
                    id?: string
                    task_id?: string
                    user_id?: string
                    completed_at?: string
                    points_earned?: number
                }
                Relationships: [
                    {
                        foreignKeyName: 'task_completions_task_id_fkey'
                        columns: ['task_id']
                        isOneToOne: false
                        referencedRelation: 'tasks'
                        referencedColumns: ['id']
                    }
                ]
            }
            student_points: {
                Row: {
                    user_id: string
                    total_points: number
                    updated_at: string
                }
                Insert: {
                    user_id: string
                    total_points?: number
                    updated_at?: string
                }
                Update: {
                    user_id?: string
                    total_points?: number
                    updated_at?: string
                }
                Relationships: []
            }
        }
        Views: { [_ in never]: never }
        Functions: { [_ in never]: never }
        Enums: {
            user_role: UserRole
        }
        CompositeTypes: { [_ in never]: never }
    }
}

// Convenience row types
export type ClassRow = Database['public']['Tables']['classes']['Row']
export type ProfileRow = Database['public']['Tables']['profiles']['Row']
export type TaskRow = Database['public']['Tables']['tasks']['Row']
export type TaskCompletionRow = Database['public']['Tables']['task_completions']['Row']
export type StudentPointsRow = Database['public']['Tables']['student_points']['Row']
