resource "azurerm_resource_group" "operations_weu" {
  name     = "${local.project_legacy}-rg-operations"
  location = local.legacy_location

  tags = local.tags
}

removed {
  from = azurerm_resource_group.itn_messages
  lifecycle {
    destroy = false
  }
}

import {
  to = azurerm_resource_group.operations_weu
  id = "/subscriptions/ec285037-c673-4f58-b594-d7c480da4e8b/resourceGroups/io-p-rg-operations"
}

resource "azurerm_role_assignment" "infra_cd_operations_weu_rbac_admin" {
  principal_id         = data.azurerm_user_assigned_identity.infra_cd_01.principal_id
  scope                = azurerm_resource_group.operations_weu.id
  role_definition_name = "Role Based Access Control Administrator"
}

resource "azurerm_role_assignment" "infra_cd_internal_weu_rbac_admin" {
  principal_id         = data.azurerm_user_assigned_identity.infra_cd_01.principal_id
  scope                = data.azurerm_resource_group.internal_rg.id
  role_definition_name = "Role Based Access Control Administrator"
}

resource "azurerm_role_assignment" "infra_cd_common_weu_rbac_admin" {
  principal_id         = data.azurerm_user_assigned_identity.infra_cd_01.principal_id
  scope                = data.azurerm_resource_group.weu_common.id
  role_definition_name = "Role Based Access Control Administrator"
}

resource "azurerm_role_assignment" "infra_cd_common_itn_01_rbac_admin" {
  principal_id         = data.azurerm_user_assigned_identity.infra_cd_01.principal_id
  scope                = data.azurerm_resource_group.itn_common_01.id
  role_definition_name = "Role Based Access Control Administrator"
}
