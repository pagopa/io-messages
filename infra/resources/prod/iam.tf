resource "azurerm_role_assignment" "cosno_api_infra_cd_account_contributor" {
  scope                = data.azurerm_cosmosdb_account.cosmos_api.id
  role_definition_name = "DocumentDB Account Contributor"
  principal_id         = data.azurerm_user_assigned_identity.infra_cd_01.principal_id
}
