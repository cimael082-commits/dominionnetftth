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
      assistente_mensagens: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
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
      banners: {
        Row: {
          ativo: boolean
          botao_texto: string | null
          botao_url: string | null
          cor: string
          created_at: string
          descricao: string | null
          fim_em: string | null
          id: string
          imagem_url: string | null
          inicio_em: string | null
          ordem: number
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          botao_texto?: string | null
          botao_url?: string | null
          cor?: string
          created_at?: string
          descricao?: string | null
          fim_em?: string | null
          id?: string
          imagem_url?: string | null
          inicio_em?: string | null
          ordem?: number
          tipo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          botao_texto?: string | null
          botao_url?: string | null
          cor?: string
          created_at?: string
          descricao?: string | null
          fim_em?: string | null
          id?: string
          imagem_url?: string | null
          inicio_em?: string | null
          ordem?: number
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
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
      chamado_mensagens: {
        Row: {
          anexo_url: string | null
          autor: string
          chamado_id: string
          created_at: string
          id: string
          mensagem: string | null
        }
        Insert: {
          anexo_url?: string | null
          autor?: string
          chamado_id: string
          created_at?: string
          id?: string
          mensagem?: string | null
        }
        Update: {
          anexo_url?: string | null
          autor?: string
          chamado_id?: string
          created_at?: string
          id?: string
          mensagem?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chamado_mensagens_chamado_id_fkey"
            columns: ["chamado_id"]
            isOneToOne: false
            referencedRelation: "chamados"
            referencedColumns: ["id"]
          },
        ]
      }
      chamados: {
        Row: {
          assunto: string
          categoria: string
          cliente_id: string
          created_at: string
          descricao: string
          id: string
          prioridade: string
          protocolo: string
          status: string
          updated_at: string
        }
        Insert: {
          assunto: string
          categoria?: string
          cliente_id: string
          created_at?: string
          descricao: string
          id?: string
          prioridade?: string
          protocolo?: string
          status?: string
          updated_at?: string
        }
        Update: {
          assunto?: string
          categoria?: string
          cliente_id?: string
          created_at?: string
          descricao?: string
          id?: string
          prioridade?: string
          protocolo?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chamados_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          codigo_indicacao: string | null
          cpf_cnpj: string | null
          cpf_cnpj_norm: string | null
          created_at: string
          data_ativacao: string | null
          dia_vencimento: number
          email: string | null
          endereco: string | null
          equipamentos: string[]
          equipamentos_obs: string | null
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
          senha_reset: string | null
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
          codigo_indicacao?: string | null
          cpf_cnpj?: string | null
          cpf_cnpj_norm?: string | null
          created_at?: string
          data_ativacao?: string | null
          dia_vencimento?: number
          email?: string | null
          endereco?: string | null
          equipamentos?: string[]
          equipamentos_obs?: string | null
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
          senha_reset?: string | null
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
          codigo_indicacao?: string | null
          cpf_cnpj?: string | null
          cpf_cnpj_norm?: string | null
          created_at?: string
          data_ativacao?: string | null
          dia_vencimento?: number
          email?: string | null
          endereco?: string | null
          equipamentos?: string[]
          equipamentos_obs?: string | null
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
          senha_reset?: string | null
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
      indicacoes: {
        Row: {
          cliente_id: string
          codigo: string
          created_at: string
          id: string
          nome_indicado: string | null
          recompensa: number
          status: string
          telefone_indicado: string | null
          updated_at: string
        }
        Insert: {
          cliente_id: string
          codigo: string
          created_at?: string
          id?: string
          nome_indicado?: string | null
          recompensa?: number
          status?: string
          telefone_indicado?: string | null
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          codigo?: string
          created_at?: string
          id?: string
          nome_indicado?: string | null
          recompensa?: number
          status?: string
          telefone_indicado?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "indicacoes_cliente_id_fkey"
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
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "operador"
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
      app_role: ["admin", "operador"],
      cliente_status: ["ativo", "bloqueado", "cancelado", "inadimplente"],
      infra_status: ["planejado", "implantacao", "ativo", "desativado"],
      parcela_status: ["pago", "pendente", "vencido", "cancelado"],
      rota_tipo: ["fibra", "colibri"],
    },
  },
} as const
