resource "azurerm_role_assignment" "cosmos_api_infra_cd_rbac_admin" {
  scope                = data.azurerm_cosmosdb_account.cosmos_api.id
  role_definition_name = "Role Based Access Control Administrator"
  principal_id         = data.azurerm_user_assigned_identity.infra_cd_01.principal_id
}
