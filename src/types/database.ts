
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "accounts": {
                  Row: {
                    "balance_cents": number,"closing_day": number | null,"connection_id": string | null,"created_at": string,"credit_limit_cents": number | null,"due_day": number | null,"external_id": string | null,"id": string,"is_active": boolean,"name": string,"type": Database["public"]['Enums']["account_type"],"user_id": string
                  }
                  Insert: {
                    "balance_cents"?: number,"closing_day"?: number | null,"connection_id"?: string | null,"created_at"?: string,"credit_limit_cents"?: number | null,"due_day"?: number | null,"external_id"?: string | null,"id"?: string,"is_active"?: boolean,"name": string,"type": Database["public"]['Enums']["account_type"],"user_id"?: string
                  }
                  Update: {
                    "balance_cents"?: number,"closing_day"?: number | null,"connection_id"?: string | null,"created_at"?: string,"credit_limit_cents"?: number | null,"due_day"?: number | null,"external_id"?: string | null,"id"?: string,"is_active"?: boolean,"name"?: string,"type"?: Database["public"]['Enums']["account_type"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "accounts_connection_id_fkey"
      columns: ["connection_id"]
isOneToOne: false
      referencedRelation: "bank_connections"
      referencedColumns: ["id"]
    }
                  ]
                },"bank_connections": {
                  Row: {
                    "consent_expires_at": string | null,"created_at": string,"external_item_id": string,"id": string,"institution_name": string,"last_synced_at": string | null,"provider": string,"status": string,"user_id": string
                  }
                  Insert: {
                    "consent_expires_at"?: string | null,"created_at"?: string,"external_item_id": string,"id"?: string,"institution_name": string,"last_synced_at"?: string | null,"provider": string,"status"?: string,"user_id"?: string
                  }
                  Update: {
                    "consent_expires_at"?: string | null,"created_at"?: string,"external_item_id"?: string,"id"?: string,"institution_name"?: string,"last_synced_at"?: string | null,"provider"?: string,"status"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"bill_payments": {
                  Row: {
                    "bill_id": string,"id": string,"paid_at": string,"reference_month": string,"transaction_id": string | null,"user_id": string
                  }
                  Insert: {
                    "bill_id": string,"id"?: string,"paid_at"?: string,"reference_month": string,"transaction_id"?: string | null,"user_id"?: string
                  }
                  Update: {
                    "bill_id"?: string,"id"?: string,"paid_at"?: string,"reference_month"?: string,"transaction_id"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bill_payments_bill_id_fkey"
      columns: ["bill_id"]
isOneToOne: false
      referencedRelation: "bills"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bill_payments_transaction_id_fkey"
      columns: ["transaction_id"]
isOneToOne: false
      referencedRelation: "transactions"
      referencedColumns: ["id"]
    }
                  ]
                },"bills": {
                  Row: {
                    "account_id": string | null,"amount_cents": number,"category_id": string | null,"created_at": string,"due_day": number,"frequency": Database["public"]['Enums']["bill_frequency"],"id": string,"installments_total": number | null,"is_active": boolean,"kind": Database["public"]['Enums']["category_kind"],"name": string,"remind_days_before": number,"starts_on": string,"user_id": string
                  }
                  Insert: {
                    "account_id"?: string | null,"amount_cents": number,"category_id"?: string | null,"created_at"?: string,"due_day": number,"frequency"?: Database["public"]['Enums']["bill_frequency"],"id"?: string,"installments_total"?: number | null,"is_active"?: boolean,"kind"?: Database["public"]['Enums']["category_kind"],"name": string,"remind_days_before"?: number,"starts_on"?: string,"user_id"?: string
                  }
                  Update: {
                    "account_id"?: string | null,"amount_cents"?: number,"category_id"?: string | null,"created_at"?: string,"due_day"?: number,"frequency"?: Database["public"]['Enums']["bill_frequency"],"id"?: string,"installments_total"?: number | null,"is_active"?: boolean,"kind"?: Database["public"]['Enums']["category_kind"],"name"?: string,"remind_days_before"?: number,"starts_on"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bills_account_id_fkey"
      columns: ["account_id"]
isOneToOne: false
      referencedRelation: "account_balances"
      referencedColumns: ["account_id"]
    },{
      foreignKeyName: "bills_account_id_fkey"
      columns: ["account_id"]
isOneToOne: false
      referencedRelation: "accounts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bills_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    }
                  ]
                },"categories": {
                  Row: {
                    "color": string,"created_at": string,"id": string,"kind": Database["public"]['Enums']["category_kind"],"name": string,"parent_id": string | null,"user_id": string
                  }
                  Insert: {
                    "color"?: string,"created_at"?: string,"id"?: string,"kind": Database["public"]['Enums']["category_kind"],"name": string,"parent_id"?: string | null,"user_id"?: string
                  }
                  Update: {
                    "color"?: string,"created_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["category_kind"],"name"?: string,"parent_id"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "categories_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    }
                  ]
                },"transactions": {
                  Row: {
                    "account_id": string,"amount_cents": number,"category_id": string | null,"created_at": string,"description": string,"external_id": string | null,"id": string,"occurred_on": string,"source": Database["public"]['Enums']["transaction_source"],"transfer_account_id": string | null,"type": Database["public"]['Enums']["transaction_type"],"user_id": string
                  }
                  Insert: {
                    "account_id": string,"amount_cents": number,"category_id"?: string | null,"created_at"?: string,"description": string,"external_id"?: string | null,"id"?: string,"occurred_on": string,"source"?: Database["public"]['Enums']["transaction_source"],"transfer_account_id"?: string | null,"type": Database["public"]['Enums']["transaction_type"],"user_id"?: string
                  }
                  Update: {
                    "account_id"?: string,"amount_cents"?: number,"category_id"?: string | null,"created_at"?: string,"description"?: string,"external_id"?: string | null,"id"?: string,"occurred_on"?: string,"source"?: Database["public"]['Enums']["transaction_source"],"transfer_account_id"?: string | null,"type"?: Database["public"]['Enums']["transaction_type"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "transactions_account_id_fkey"
      columns: ["account_id"]
isOneToOne: false
      referencedRelation: "account_balances"
      referencedColumns: ["account_id"]
    },{
      foreignKeyName: "transactions_account_id_fkey"
      columns: ["account_id"]
isOneToOne: false
      referencedRelation: "accounts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "transactions_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "transactions_transfer_account_id_fkey"
      columns: ["transfer_account_id"]
isOneToOne: false
      referencedRelation: "account_balances"
      referencedColumns: ["account_id"]
    },{
      foreignKeyName: "transactions_transfer_account_id_fkey"
      columns: ["transfer_account_id"]
isOneToOne: false
      referencedRelation: "accounts"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "account_balances": {
                  Row: {
                    "account_id": string | null,"current_balance_cents": number | null
                  }
                  Insert: {
                           "account_id"?: string | null,"current_balance_cents"?: never
                         }
                        Update: {
                           "account_id"?: string | null,"current_balance_cents"?: never
                         }
                        Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "pay_bill":
{ Args: { "p_account_id": string,"p_bill_id": string,"p_paid_on": string,"p_reference_month": string }; Returns: string
                           },
"unpay_bill":
{ Args: { "p_bill_id": string,"p_reference_month": string }; Returns: undefined
                           }
          }
          Enums: {
            "account_type": "checking"|"savings"|"credit_card"|"wallet","bill_frequency": "monthly"|"yearly"|"once","category_kind": "income"|"expense","transaction_source": "manual"|"bank","transaction_type": "income"|"expense"|"transfer"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "account_type": ["checking", "savings", "credit_card", "wallet"],"bill_frequency": ["monthly", "yearly", "once"],"category_kind": ["income", "expense"],"transaction_source": ["manual", "bank"],"transaction_type": ["income", "expense", "transfer"]
          }
        }
} as const
