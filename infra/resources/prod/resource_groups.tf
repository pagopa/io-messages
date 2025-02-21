resource "azurerm_resource_group" "itn_com" {
  name     = "${local.project}-${local.domain}-rg-01"
  location = local.location
}

resource "azurerm_role_assignment" "infra_cd_operations_weu_rbac_admin" {
  principal_id         = data.azurerm_user_assigned_identity.infra_cd_01.principal_id
  scope                = data.azurerm_resource_group.operations_weu.id
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

resource "azurerm_role_assignment" "infra_ci_rg_cosmos_contributor" {
  scope                = azurerm_resource_group.itn_com.id
  role_definition_name = "DocumentDB Account Contributor"
  principal_id         = data.azurerm_user_assigned_identity.infra_ci_01.principal_id
  description          = "Allow Infra CI identity to read Cosmos DB configuration at resource group scope"
}

resource "azurerm_role_assignment" "infra_ci_rg_st_blob_reader" {
  scope                = azurerm_resource_group.itn_com.id
  role_definition_name = "Storage Blob Data Reader"
  principal_id         = data.azurerm_user_assigned_identity.infra_ci_01.principal_id
  description          = "Allow Infra CI identity to read Storage Account blobs monorepository resource group scope"
}

resource "azurerm_role_assignment" "infra_ci_rg_st_queue_reader" {
  scope                = azurerm_resource_group.itn_com.id
  role_definition_name = "Storage Queue Data Reader"
  principal_id         = data.azurerm_user_assigned_identity.infra_ci_01.principal_id
  description          = "Allow Infra CI identity to read Storage Account queues monorepository resource group scope"
}

resource "azurerm_role_assignment" "infra_ci_rg_st_table_reader" {
  scope                = azurerm_resource_group.itn_com.id
  role_definition_name = "Storage Table Data Reader"
  principal_id         = data.azurerm_user_assigned_identity.infra_ci_01.principal_id
  description          = "Allow Infra CI identity to read Storage Account tables monorepository resource group scope"
}

resource "azurerm_role_assignment" "infra_cd_rg_contributor" {
  scope                = azurerm_resource_group.itn_com.id
  role_definition_name = "Contributor"
  principal_id         = data.azurerm_user_assigned_identity.infra_cd_01.principal_id
  description          = "Allow Infra CD identity to apply changes to resources at monorepository resource group scope"
}

resource "azurerm_role_assignment" "infra_cd_rg_rbac_admin" {
  scope                = azurerm_resource_group.itn_com.id
  role_definition_name = "Role Based Access Control Administrator"
  principal_id         = data.azurerm_user_assigned_identity.infra_cd_01.principal_id
  description          = "Allow Infra CD identity to manage IAM configuration at monorepository resource group scope"
}

resource "azurerm_role_assignment" "infra_cd_rg_user_access_admin" {
  scope                = azurerm_resource_group.itn_com.id
  role_definition_name = "User Access Administrator"
  principal_id         = data.azurerm_user_assigned_identity.infra_cd_01.principal_id
  description          = "Allow Infra CD identity to manage locks at monorepository resource group scope"
}

resource "azurerm_role_assignment" "infra_cd_rg_st_blob_contributor" {
  scope                = azurerm_resource_group.itn_com.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = data.azurerm_user_assigned_identity.infra_cd_01.principal_id
  description          = "Allow Infra CD identity to write Storage Account blobs monorepository resource group scope"
}

resource "azurerm_role_assignment" "infra_cd_rg_st_queue_contributor" {
  scope                = azurerm_resource_group.itn_com.id
  role_definition_name = "Storage Queue Data Contributor"
  principal_id         = data.azurerm_user_assigned_identity.infra_cd_01.principal_id
  description          = "Allow Infra CD identity to write Storage Account queues monorepository resource group scope"
}

resource "azurerm_role_assignment" "infra_cd_rg_st_table_contributor" {
  scope                = azurerm_resource_group.itn_com.id
  role_definition_name = "Storage Table Data Contributor"
  principal_id         = data.azurerm_user_assigned_identity.infra_cd_01.principal_id
  description          = "Allow Infra CD identity to write Storage Account tables monorepository resource group scope"
}

resource "azurerm_role_assignment" "admins_group_rg" {
  scope                = azurerm_resource_group.itn_com.id
  role_definition_name = "Owner"
  principal_id         = data.azuread_group.adgroup_com_admins.object_id
  description          = "Allow AD Admin group the complete ownership at monorepository resource group scope"
}

resource "azurerm_role_assignment" "devs_group_rg" {
  scope                = azurerm_resource_group.itn_com.id
  role_definition_name = "Contributor"
  principal_id         = data.azuread_group.adgroup_com_devs.object_id
  description          = "Allow AD Dev group to apply changes at monorepository resource group scope"
}

resource "azurerm_role_assignment" "app_cd_rg_contributor" {
  scope                = azurerm_resource_group.itn_com.id
  role_definition_name = "Contributor"
  principal_id         = data.azurerm_user_assigned_identity.app_cd_01.principal_id
  description          = "Allow App CD identity to apply changes to AppServices at monorepository resource group scope"
}

resource "azurerm_role_assignment" "devs_group_rg_com_eh" {
  scope                = azurerm_resource_group.itn_com.id
  role_definition_name = "Azure Event Hubs Data Owner"
  principal_id         = data.azuread_group.adgroup_com_devs.object_id
  description          = "Allow AD Dev group to manage EventHub monorepository resource group scope"
}
