terraform {

  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "iopitntfst001"
    container_name       = "terraform-state"
    key                  = "io-messages.resources.tfstate"
    use_azuread_auth     = true
  }

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~>4"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~>3"
    }
  }
}

provider "azurerm" {
  features {}
}

module "redis_messages" {
  source = "github.com/pagopa/terraform-azurerm-v4//redis_cache?ref=v1.2.1"

  name                = "${local.project}-msgs-redis-01"
  resource_group_name = data.azurerm_resource_group.itn_messages.name
  location            = data.azurerm_resource_group.itn_messages.location

  capacity              = 1
  family                = "P"
  sku_name              = "Premium"
  redis_version         = "6"
  enable_authentication = true
  zones                 = [1, 2]

  // when azure can apply patch?
  patch_schedules = [{
    day_of_week    = "Sunday"
    start_hour_utc = 23
    },
    {
      day_of_week    = "Monday"
      start_hour_utc = 23
    },
    {
      day_of_week    = "Tuesday"
      start_hour_utc = 23
    },
    {
      day_of_week    = "Wednesday"
      start_hour_utc = 23
    },
    {
      day_of_week    = "Thursday"
      start_hour_utc = 23
    },
  ]

  private_endpoint = {
    enabled              = true
    subnet_id            = data.azurerm_subnet.pep.id
    virtual_network_id   = data.azurerm_virtual_network.vnet_common_itn.id
    private_dns_zone_ids = [data.azurerm_private_dns_zone.privatelink_redis_cache.id]
  }

  tags = local.tags
}

module "functions_messages_sending" {
  source = "../_modules/function_app_sending"

  prefix              = local.prefix
  env_short           = local.env_short
  location            = local.location
  project             = local.project
  domain              = "msgs"
  resource_group_name = data.azurerm_resource_group.itn_messages.name

  cidr_subnet_messages_sending_func    = "10.20.1.0/24"
  private_endpoint_subnet_id           = data.azurerm_subnet.pep.id
  private_dns_zone_resource_group_name = data.azurerm_resource_group.weu_common.name
  virtual_network = {
    resource_group_name = data.azurerm_virtual_network.vnet_common_itn.resource_group_name
    name                = data.azurerm_virtual_network.vnet_common_itn.name
  }

  ai_instrumentation_key = data.azurerm_application_insights.common.instrumentation_key
  ai_connection_string   = data.azurerm_application_insights.common.connection_string
  ai_sampling_percentage = 5

  cosmos_db_api_endpoint = data.azurerm_cosmosdb_account.cosmos_api.endpoint
  cosmos_db_api_key      = data.azurerm_cosmosdb_account.cosmos_api.primary_key

  io_com_cosmos_endpoint = data.azurerm_cosmosdb_account.io_com_cosmos.endpoint
  io_com_cosmos_key      = data.azurerm_cosmosdb_account.io_com_cosmos.primary_key

  cosmos_database_names = []

  redis_url      = module.redis_messages.hostname
  redis_port     = module.redis_messages.ssl_port
  redis_password = module.redis_messages.primary_access_key

  appbackendli_token = data.azurerm_key_vault_secret.appbackendli_token.value

  message_storage_account_blob_connection_string       = data.azurerm_storage_account.storage_api.primary_connection_string
  notification_storage_account_queue_connection_string = data.azurerm_storage_account.storage_push_notifications.primary_connection_string

  internal_user_id = data.azurerm_key_vault_secret.internal_user.value

  tags = local.tags

  action_group_id = module.monitoring.action_group.io_com_error_id
}

/*module "functions_messages_citizen_1" {
  source = "../_modules/function_app_citizen"

  prefix              = local.prefix
  env_short           = local.env_short
  location            = local.location
  project             = local.project
  domain              = local.domain
  resource_group_name = azurerm_resource_group.itn_messages.name

  instance_number                      = "01"
  cidr_subnet_messages_citizen_func    = "10.20.10.0/26"
  private_endpoint_subnet_id           = data.azurerm_subnet.pep.id
  private_dns_zone_resource_group_name = data.azurerm_resource_group.weu_common.name
  virtual_network = {
    resource_group_name = data.azurerm_virtual_network.vnet_common_itn.resource_group_name
    name                = data.azurerm_virtual_network.vnet_common_itn.name
  }
  nat_gateway_id = data.azurerm_nat_gateway.itn_ng.id

  ai_instrumentation_key = data.azurerm_application_insights.common.instrumentation_key
  ai_connection_string   = data.azurerm_application_insights.common.connection_string
  ai_sampling_percentage = 5

  cosmos_db_api_endpoint = data.azurerm_cosmosdb_account.cosmos_api.endpoint
  cosmos_db_api_key      = data.azurerm_cosmosdb_account.cosmos_api.primary_key

  cosmos_db_remote_content_endpoint = data.azurerm_cosmosdb_account.cosmos_remote_content.endpoint
  cosmos_db_remote_content_key      = data.azurerm_cosmosdb_account.cosmos_remote_content.primary_key

  redis_url      = module.redis_messages.hostname
  redis_port     = module.redis_messages.ssl_port
  redis_password = module.redis_messages.primary_access_key

  message_storage_account_blob_connection_string = data.azurerm_storage_account.storage_api.primary_connection_string

  use_fallback          = false
  ff_type               = "none"
  ff_beta_tester_list   = data.azurerm_key_vault_secret.fn_messages_APP_MESSAGES_BETA_FISCAL_CODES.value
  ff_canary_users_regex = "^([(0-9)|(a-f)|(A-F)]{62}00)$" // takes 0.4% of users

  tags = local.tags

  action_group_id = module.monitoring.action_group.io_com_error_id
}*/

/*module "functions_messages_citizen_2" {
  source = "../_modules/function_app_citizen"

  prefix              = local.prefix
  env_short           = local.env_short
  location            = local.location
  project             = local.project
  domain              = local.domain
  resource_group_name = azurerm_resource_group.itn_messages.name

  instance_number                      = "02"
  cidr_subnet_messages_citizen_func    = "10.20.10.128/26"
  private_endpoint_subnet_id           = data.azurerm_subnet.pep.id
  private_dns_zone_resource_group_name = data.azurerm_resource_group.weu_common.name
  virtual_network = {
    resource_group_name = data.azurerm_virtual_network.vnet_common_itn.resource_group_name
    name                = data.azurerm_virtual_network.vnet_common_itn.name
  }
  nat_gateway_id = data.azurerm_nat_gateway.itn_ng.id

  ai_instrumentation_key = data.azurerm_application_insights.common.instrumentation_key
  ai_connection_string   = data.azurerm_application_insights.common.connection_string
  ai_sampling_percentage = 5

  cosmos_db_api_endpoint = data.azurerm_cosmosdb_account.cosmos_api.endpoint
  cosmos_db_api_key      = data.azurerm_cosmosdb_account.cosmos_api.primary_key

  cosmos_db_remote_content_endpoint = data.azurerm_cosmosdb_account.cosmos_remote_content.endpoint
  cosmos_db_remote_content_key      = data.azurerm_cosmosdb_account.cosmos_remote_content.primary_key

  redis_url      = module.redis_messages.hostname
  redis_port     = module.redis_messages.ssl_port
  redis_password = module.redis_messages.primary_access_key

  message_storage_account_blob_connection_string = data.azurerm_storage_account.storage_api.primary_connection_string

  use_fallback          = false
  ff_type               = "none"
  ff_beta_tester_list   = data.azurerm_key_vault_secret.fn_messages_APP_MESSAGES_BETA_FISCAL_CODES.value
  ff_canary_users_regex = "^([(0-9)|(a-f)|(A-F)]{62}00)$" // takes 0.4% of users

  tags = local.tags

  action_group_id = module.monitoring.action_group.io_com_error_id
}*/

module "monitoring" {
  source              = "../_modules/monitoring/"
  location            = local.location
  project             = local.project
  resource_group_name = data.azurerm_resource_group.itn_messages.name
  io_com_slack_email  = data.azurerm_key_vault_secret.io_com_slack_email.value
}

module "cosmos" {
  source           = "../_modules/cosmos"
  cosmosdb_account = data.azurerm_cosmosdb_account.cosmos_api
  tags             = local.tags
  resource_group   = "io-p-itn-com-rg-01"
  action_group_id  = module.monitoring.action_group.io_com_error_id
  subnet_pep_id    = data.azurerm_subnet.pep.id
  environment = {
    prefix          = local.prefix
    env_short       = local.env_short
    location        = local.location
    app_name        = "com"
    instance_number = "01"
  }
}

module "io_com_storage_account" {
  source              = "../_modules/com_storage_account/"
  resource_group_name = data.azurerm_resource_group.itn_messages.name
  environment = {
    prefix          = local.prefix
    env_short       = local.env_short
    location        = local.location
    instance_number = "01"
  }
  subnet_pep_id = data.azurerm_subnet.pep.id
  tags          = local.tags
}
