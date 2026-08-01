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
      aviso_leituras: {
        Row: {
          aviso_id: string
          cliente_id: string
          id: string
          lido_em: string
        }
        Insert: {
          aviso_id: string
          cliente_id: string
          id?: string
          lido_em?: string
        }
        Update: {
          aviso_id?: string
          cliente_id?: string
          id?: string
          lido_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "aviso_leituras_aviso_id_fkey"
            columns: ["aviso_id"]
            isOneToOne: false
            referencedRelation: "avisos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aviso_leituras_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      avisos: {
        Row: {
          cliente_id: string | null
          created_at: string
          destino: string
          id: string
          mensagem: string
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          destino?: string
          id?: string
          mensagem: string
          tipo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          destino?: string
          id?: string
          mensagem?: string
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "avisos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
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
          cpf_cnpj_norm: string | null
          created_at: string
          data_ativacao: string | null
          dia_vencimento: number
          email: string | null
          endereco: string | null
          facebook_id: string | null
          google_sub: string | null
          id: string
          ip_atual: string | null
          latitude: number | null
          linked_at: string | null
          login_pppoe: string | null
          longitude: number | null
          nome: string
          observacoes: string | null
          online: boolean
          plano: string | null
          router_id: string | null
          senha_cliente_hash: string | null
          senha_pppoe: string | null
          senha_wifi: string | null
          ssid_wifi: string | null
          status: Database["public"]["Enums"]["cliente_status"]
          telefone: string | null
          ultima_sincronizacao: string | null
          updated_at: string
          uptime_atual: string | null
          valor_mensalidade: number
          whatsapp: string | null
          wifi_senha: string | null
          wifi_ssid: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cpf_cnpj?: string | null
          cpf_cnpj_norm?: string | null
          created_at?: string
          data_ativacao?: string | null
          dia_vencimento?: number
          email?: string | null
          endereco?: string | null
          facebook_id?: string | null
          google_sub?: string | null
          id?: string
          ip_atual?: string | null
          latitude?: number | null
          linked_at?: string | null
          login_pppoe?: string | null
          longitude?: number | null
          nome: string
          observacoes?: string | null
          online?: boolean
          plano?: string | null
          router_id?: string | null
          senha_cliente_hash?: string | null
          senha_pppoe?: string | null
          senha_wifi?: string | null
          ssid_wifi?: string | null
          status?: Database["public"]["Enums"]["cliente_status"]
          telefone?: string | null
          ultima_sincronizacao?: string | null
          updated_at?: string
          uptime_atual?: string | null
          valor_mensalidade?: number
          whatsapp?: string | null
          wifi_senha?: string | null
          wifi_ssid?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cpf_cnpj?: string | null
          cpf_cnpj_norm?: string | null
          created_at?: string
          data_ativacao?: string | null
          dia_vencimento?: number
          email?: string | null
          endereco?: string | null
          facebook_id?: string | null
          google_sub?: string | null
          id?: string
          ip_atual?: string | null
          latitude?: number | null
          linked_at?: string | null
          login_pppoe?: string | null
          longitude?: number | null
          nome?: string
          observacoes?: string | null
          online?: boolean
          plano?: string | null
          router_id?: string | null
          senha_cliente_hash?: string | null
          senha_pppoe?: string | null
          senha_wifi?: string | null
          ssid_wifi?: string | null
          status?: Database["public"]["Enums"]["cliente_status"]
          telefone?: string | null
          ultima_sincronizacao?: string | null
          updated_at?: string
          uptime_atual?: string | null
          valor_mensalidade?: number
          whatsapp?: string | null
          wifi_senha?: string | null
          wifi_ssid?: string | null
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
      cto_portas: {
        Row: {
          cliente_id: string | null
          created_at: string
          cto_id: string
          id: string
          observacao: string | null
          porta_numero: number
          updated_at: string
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          cto_id: string
          id?: string
          observacao?: string | null
          porta_numero: number
          updated_at?: string
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          cto_id?: string
          id?: string
          observacao?: string | null
          porta_numero?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cto_portas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cto_portas_cto_id_fkey"
            columns: ["cto_id"]
            isOneToOne: false
            referencedRelation: "ctos"
            referencedColumns: ["id"]
          },
        ]
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
          router_id: string | null
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
          router_id?: string | null
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
          router_id?: string | null
          status?: Database["public"]["Enums"]["infra_status"]
          updated_at?: string
        }
        Relationships: []
      }
      eventos_conexao: {
        Row: {
          cliente_id: string | null
          created_at: string
          id: string
          ip: string | null
          login_pppoe: string
          router_id: string | null
          tipo: string
          uptime: string | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          login_pppoe: string
          router_id?: string | null
          tipo: string
          uptime?: string | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          id?: string
          ip?: string | null
          login_pppoe?: string
          router_id?: string | null
          tipo?: string
          uptime?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eventos_conexao_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          aviso_id: string | null
          cliente_id: string
          corpo: string
          created_at: string
          id: string
          lido: boolean
          parcela_id: string | null
          tipo: string
          titulo: string
        }
        Insert: {
          aviso_id?: string | null
          cliente_id: string
          corpo: string
          created_at?: string
          id?: string
          lido?: boolean
          parcela_id?: string | null
          tipo: string
          titulo: string
        }
        Update: {
          aviso_id?: string | null
          cliente_id?: string
          corpo?: string
          created_at?: string
          id?: string
          lido?: boolean
          parcela_id?: string | null
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_aviso_id_fkey"
            columns: ["aviso_id"]
            isOneToOne: false
            referencedRelation: "avisos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_parcela_id_fkey"
            columns: ["parcela_id"]
            isOneToOne: false
            referencedRelation: "parcelas"
            referencedColumns: ["id"]
          },
        ]
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
          comprimento_m: number | null
          coordenadas: Json
          cor_cabo: string
          created_at: string
          fibras_qtd: number
          fibras_usadas: number
          id: string
          nome: string
          observacoes: string | null
          status: Database["public"]["Enums"]["infra_status"]
          tipo: Database["public"]["Enums"]["rota_tipo"]
          updated_at: string
        }
        Insert: {
          comprimento_m?: number | null
          coordenadas?: Json
          cor_cabo?: string
          created_at?: string
          fibras_qtd?: number
          fibras_usadas?: number
          id?: string
          nome: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["infra_status"]
          tipo?: Database["public"]["Enums"]["rota_tipo"]
          updated_at?: string
        }
        Update: {
          comprimento_m?: number | null
          coordenadas?: Json
          cor_cabo?: string
          created_at?: string
          fibras_qtd?: number
          fibras_usadas?: number
          id?: string
          nome?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["infra_status"]
          tipo?: Database["public"]["Enums"]["rota_tipo"]
          updated_at?: string
        }
        Relationships: []
      }
      roteadores: {
        Row: {
          clientes_online: number
          clientes_total: number
          created_at: string
          id: string
          identity: string | null
          ip: string | null
          nome: string
          observacoes: string | null
          online: boolean
          router_id: string
          ultima_sincronizacao: string | null
          updated_at: string
          versao: string | null
        }
        Insert: {
          clientes_online?: number
          clientes_total?: number
          created_at?: string
          id?: string
          identity?: string | null
          ip?: string | null
          nome: string
          observacoes?: string | null
          online?: boolean
          router_id: string
          ultima_sincronizacao?: string | null
          updated_at?: string
          versao?: string | null
        }
        Update: {
          clientes_online?: number
          clientes_total?: number
          created_at?: string
          id?: string
          identity?: string | null
          ip?: string | null
          nome?: string
          observacoes?: string | null
          online?: boolean
          router_id?: string
          ultima_sincronizacao?: string | null
          updated_at?: string
          versao?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      atualizar_status_vencidos: { Args: never; Returns: undefined }
      gerar_lembretes_vencimento: { Args: never; Returns: number }
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
