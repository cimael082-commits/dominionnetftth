export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ceo_emendas: {
        Row: {
          created_at: string
          id: string
          latitude: number
          longitude: number
          nome: string
          observacoes: string | null
          status: Database["public"]["Enums"]["infra_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          latitude: number
          longitude: number
          nome: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["infra_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          nome?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["infra_status"]
          updated_at?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          cpf_cnpj: string | null
          created_at: string
          data_ativacao: string | null
          dia_vencimento: number
          email: string | null
          endereco: string | null
          id: string
          latitude: number | null
          login_pppoe: string | null
          longitude: number | null
          nome: string
          observacoes: string | null
          plano: string | null
          senha_pppoe: string | null
          senha_wifi: string | null
          ssid_wifi: string | null
          status: Database["public"]["Enums"]["cliente_status"]
          telefone: string | null
          updated_at: string
          valor_mensalidade: number
          whatsapp: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          data_ativacao?: string | null
          dia_vencimento?: number
          email?: string | null
          endereco?: string | null
          id?: string
          latitude?: number | null
          login_pppoe?: string | null
          longitude?: number | null
          nome: string
          observacoes?: string | null
          plano?: string | null
          senha_pppoe?: string | null
          senha_wifi?: string | null
          ssid_wifi?: string | null
          status?: Database["public"]["Enums"]["cliente_status"]
          telefone?: string | null
          updated_at?: string
          valor_mensalidade?: number
          whatsapp?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          data_ativacao?: string | null
          dia_vencimento?: number
          email?: string | null
          endereco?: string | null
          id?: string
          latitude?: number | null
          login_pppoe?: string | null
          longitude?: number | null
          nome?: string
          observacoes?: string | null
          plano?: string | null
          senha_pppoe?: string | null
          senha_wifi?: string | null
          ssid_wifi?: string | null
          status?: Database["public"]["Enums"]["cliente_status"]
          telefone?: string | null
          updated_at?: string
          valor_mensalidade?: number
          whatsapp?: string | null
        }
        Relationships: []
      }
      configuracoes_empresa: {
        Row: {
          cidade: string | null
          cnpj: string | null
          created_at: string
          endereco: string | null
          id: string
          nome_empresa: string
          pix_beneficiario: string
          pix_chave: string
          pix_cidade: string
          pix_tipo: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          nome_empresa?: string
          pix_beneficiario?: string
          pix_chave?: string
          pix_cidade?: string
          pix_tipo?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          nome_empresa?: string
          pix_beneficiario?: string
          pix_chave?: string
          pix_cidade?: string
          pix_tipo?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ctos: {
        Row: {
          created_at: string
          id: string
          latitude: number
          longitude: number
          nome: string
          observacoes: string | null
          portas_livres: number
          portas_totais: number
          status: Database["public"]["Enums"]["infra_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          latitude: number
          longitude: number
          nome: string
          observacoes?: string | null
          portas_livres?: number
          portas_totais?: number
          status?: Database["public"]["Enums"]["infra_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          nome?: string
          observacoes?: string | null
          portas_livres?: number
          portas_totais?: number
          status?: Database["public"]["Enums"]["infra_status"]
          updated_at?: string
        }
        Relationships: []
      }
      parcelas: {
        Row: {
          cliente_id: string
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          forma_pagamento: string | null
          id: string
          numero_parcela: number | null
          observacao: string | null
          origem: string
          referencia_ano: number
          referencia_mes: number
          status: Database["public"]["Enums"]["parcela_status"]
          total_parcelas: number | null
          updated_at: string
          valor: number
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento: string
          forma_pagamento?: string | null
          id?: string
          numero_parcela?: number | null
          observacao?: string | null
          origem?: string
          referencia_ano: number
          referencia_mes: number
          status?: Database["public"]["Enums"]["parcela_status"]
          total_parcelas?: number | null
          updated_at?: string
          valor: number
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string
          forma_pagamento?: string | null
          id?: string
          numero_parcela?: number | null
          observacao?: string | null
          origem?: string
          referencia_ano?: number
          referencia_mes?: number
          status?: Database["public"]["Enums"]["parcela_status"]
          total_parcelas?: number | null
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "parcelas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      rotas_fibra: {
        Row: {
          coordenadas: Json
          created_at: string
          id: string
          nome: string
          observacoes: string | null
          status: Database["public"]["Enums"]["infra_status"]
          tipo: Database["public"]["Enums"]["rota_tipo"]
          updated_at: string
        }
        Insert: {
          coordenadas?: Json
          created_at?: string
          id?: string
          nome: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["infra_status"]
          tipo?: Database["public"]["Enums"]["rota_tipo"]
          updated_at?: string
        }
        Update: {
          coordenadas?: Json
          created_at?: string
          id?: string
          nome?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["infra_status"]
          tipo?: Database["public"]["Enums"]["rota_tipo"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      atualizar_status_vencidos: { Args: never; Returns: undefined }
    }
    Enums: {
      cliente_status: "ativo" | "bloqueado" | "cancelado" | "inadimplente"
      infra_status: "planejado" | "implantacao" | "ativo" | "desativado"
      parcela_status: "pago" | "pendente" | "vencido" | "cancelado"
      rota_tipo: "fibra" | "colibri"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      cliente_status: ["ativo", "bloqueado", "cancelado", "inadimplente"],
      infra_status: ["planejado", "implantacao", "ativo", "desativado"],
      parcela_status: ["pago", "pendente", "vencido", "cancelado"],
      rota_tipo: ["fibra", "colibri"],
    },
  },
} as const
