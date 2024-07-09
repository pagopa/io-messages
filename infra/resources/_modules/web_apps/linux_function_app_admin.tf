module "admin_func" {
  source = "git::https://github.com/pagopa/dx.git//infra/modules/azure_function_app?ref=main"

  environment = merge(var.environment, {
    app_name        = "notif",
    instance_number = "01"
  })

  tier = "test"

  resource_group_name                  = var.resource_group_name
  private_dns_zone_resource_group_name = var.private_dns_zone_resource_group_name

  health_check_path = "/api/health"

  app_settings = {
    NODE_ENVIRONMENT               = "production",
    GCM_MIGRATION_PATH             = "gcm-migration/part-{name}",
    GCM_MIGRATION_QUEUE_NAME       = var.gcm_migration_storage.queue.name
    GCM_MIGRATION__serviceUri      = var.gcm_migration_storage.blob_endpoint,
    GCM_MIGRATION__queueServiceUri = var.gcm_migration_storage.queue_endpoint
  }

  sticky_app_setting_names = ["NODE_ENVIRONMENT"]

  virtual_network = var.virtual_network

  subnet_cidr   = var.subnet_cidrs.notif_func
  subnet_pep_id = var.subnet_pep_id

  tags = var.tags
}

resource "azurerm_role_assignment" "notif_func" {
  for_each             = toset(["Storage Blob Data Owner", "Storage Queue Data Contributor", "Storage Queue Data Reader", "Storage Queue Data Message Processor", "Storage Queue Data Message Sender"])
  scope                = var.gcm_migration_storage.id
  role_definition_name = each.key
  principal_id         = module.admin_func.function_app.function_app.principal_id
}
