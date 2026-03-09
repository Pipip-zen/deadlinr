export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type TaskStatus = 'pending' | 'done' | 'overdue'

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
            courses: {
                Row: {
                    id: string
                    user_id: string
                    name: string
                    code: string
                    color: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    name: string
                    code: string
                    color: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    name?: string
                    code?: string
                    color?: string
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: 'courses_user_id_fkey'
                        columns: ['user_id']
                        isOneToOne: false
                        referencedRelation: 'profiles'
                        referencedColumns: ['id']
                    }
                ]
            }
            profiles: {
                Row: {
                    id: string
                    name: string | null
                    avatar_url: string | null
                    class_id: string | null
                    created_at: string
                }
                Insert: {
                    id: string
                    name?: string | null
                    avatar_url?: string | null
                    class_id?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string | null
                    avatar_url?: string | null
                    class_id?: string | null
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
                    course_id: string | null
                    title: string
                    description: string | null
                    deadline: string
                    user_id: string
                    status: TaskStatus
                    created_at: string
                    completed_at: string | null
                }
                Insert: {
                    id?: string
                    course_id?: string | null
                    title: string
                    description?: string | null
                    deadline: string
                    user_id: string
                    status?: TaskStatus
                    created_at?: string
                    completed_at?: string | null
                }
                Update: {
                    id?: string
                    course_id?: string | null
                    title?: string
                    description?: string | null
                    deadline?: string
                    user_id?: string
                    status?: TaskStatus
                    created_at?: string
                    completed_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: 'tasks_course_id_fkey'
                        columns: ['course_id']
                        isOneToOne: false
                        referencedRelation: 'courses'
                        referencedColumns: ['id']
                    },
                    {
                        foreignKeyName: 'tasks_user_id_fkey'
                        columns: ['user_id']
                        isOneToOne: false
                        referencedRelation: 'profiles'
                        referencedColumns: ['id']
                    },
                    {
                        foreignKeyName: 'tasks_course_id_fkey'
                        columns: ['course_id']
                        isOneToOne: false
                        referencedRelation: 'courses'
                        referencedColumns: ['id']
                    }
                ]
            }
        }
        Views: { [_ in never]: never }
        Functions: { [_ in never]: never }
        Enums: { [_ in never]: never }
        CompositeTypes: { [_ in never]: never }
    }
}

// Convenience row types
export type ClassRow = Database['public']['Tables']['classes']['Row']
export type ProfileRow = Database['public']['Tables']['profiles']['Row']
export type TaskRow = Database['public']['Tables']['tasks']['Row']
export type CourseRow = Database['public']['Tables']['courses']['Row']
