resource "azurerm_role_assignment" "cae_admins_contributor" {
  for_each = var.entra_id_admin_ids

  role_definition_name = "Owner"
  scope                = module.com_cae.id
  principal_id         = each.value
  description          = "Allow IO Admins to read Spring Dashboard"
}

resource "azurerm_key_vault_access_policy" "reminder" {
  key_vault_id       = var.key_vault_id
  secret_permissions = ["Get", "List"]
  object_id          = module.com_cae.user_assigned_identity.principal_id
  tenant_id          = var.tenant_id
}
