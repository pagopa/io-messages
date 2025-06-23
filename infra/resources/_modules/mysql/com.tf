data "azurerm_key_vault_secret" "mysql_admin_username" {
  name         = "mysql-admin-username"
  key_vault_id = var.key_vault.id
}

data "azurerm_key_vault_secret" "mysql_admin_password" {
  name         = "mysql-admin-password"
  key_vault_id = var.key_vault.id
}

data "azurerm_private_dns_zone" "mysql_azure_com" {
  name                = "privatelink.mysql.database.azure.com"
  resource_group_name = var.common_resource_group_name
}

resource "azurerm_subnet" "com_mysql" {
  name = provider::dx::resource_name({
    prefix          = var.environment.prefix
    domain          = var.environment.domain,
    name            = "mysql"
    resource_type   = "subnet",
    environment     = var.environment.env_short,
    location        = var.environment.location
    instance_number = 1
  })
  virtual_network_name = var.virtual_network.name
  resource_group_name  = var.virtual_network.resource_group_name
  address_prefixes     = [var.subnet_cidrs.com]

  service_endpoints = ["Microsoft.Storage"]

  delegation {
    name = "fs"
    service_delegation {
      name    = "Microsoft.DBforMySQL/flexibleServers"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

resource "azurerm_mysql_flexible_server" "com" {
  name = provider::dx::resource_name({
    prefix          = var.environment.prefix
    name            = "com",
    resource_type   = "mysql",
    environment     = var.environment.env_short,
    location        = var.environment.location
    instance_number = 1
  })
  location               = var.environment.location
  resource_group_name    = var.resource_group_name
  administrator_login    = data.azurerm_key_vault_secret.mysql_admin_username.value
  administrator_password = data.azurerm_key_vault_secret.mysql_admin_password.value
  backup_retention_days  = 7
  private_dns_zone_id    = data.azurerm_private_dns_zone.mysql_azure_com.id
  delegated_subnet_id    = azurerm_subnet.com_mysql.id
  version                = "8.0.21"
  sku_name               = "B_Standard_B1ms"
  zone                   = "3"
  tags                   = var.tags
}

resource "azurerm_mysql_flexible_database" "reminder" {
  name                = "reminder"
  resource_group_name = var.resource_group_name
  server_name         = azurerm_mysql_flexible_server.com.name
  charset             = "utf8mb3"
  collation           = "utf8mb3_unicode_ci"
}

resource "azurerm_mysql_flexible_server_configuration" "max_connections" {
  name                = "max_connections"
  resource_group_name = var.resource_group_name
  server_name         = azurerm_mysql_flexible_server.com.name
  value               = "341"
}

resource "azurerm_key_vault_secret" "reminder_mysql_db_server_url" {
  name = "mysql-reminder-db-url"
  value = format("jdbc:mysql://%s:%s/%s",
    trimsuffix(azurerm_mysql_flexible_server.com.fqdn, "."),
  "3306", azurerm_mysql_flexible_database.reminder.name)
  content_type = "text/plain"
  key_vault_id = var.key_vault.id
}
